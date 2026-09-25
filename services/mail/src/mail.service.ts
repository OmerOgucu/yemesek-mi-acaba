import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { readConfig } from '@yemesek/config';
import { PrismaService } from '@yemesek/database';
import { BrevoMailProvider } from './brevo-mail.provider';
import { ConsoleMailProvider } from './console-mail.provider';
import { TEMPLATE_DEFAULTS, isTemplateKey, type TemplateKey } from './defaults';
import type { MailProvider } from './mail.provider';
import { renderTemplate } from './render-template';

export type MailVars = {
  displayName: string;
  code?: string;
  verifyUrl?: string;
  resetUrl?: string;
};

export type DevVerificationHint = {
  code: string;
  verifyUrl: string;
};

@Injectable()
export class MailService {
  private readonly devHints = new Map<string, DevVerificationHint>();

  constructor(private readonly prisma: PrismaService) {}

  devHint(email: string): DevVerificationHint | undefined {
    const config = readConfig();
    if (config.isProduction || config.brevoApiKey) return undefined;
    return this.devHints.get(email.trim().toLowerCase());
  }

  async render(key: TemplateKey, vars: MailVars): Promise<{ subject: string; html: string; text: string }> {
    const config = readConfig();
    const stored = await this.prisma.emailTemplate.findUnique({ where: { key } });
    const fallback = TEMPLATE_DEFAULTS[key];
    const subjectSource = stored?.subject || fallback.subject;
    const htmlSource = stored?.htmlBody || fallback.htmlBody;
    const textSource = stored?.textBody || fallback.textBody;
    const values: Record<string, string> = {
      displayName: vars.displayName,
      code: vars.code ?? '',
      verifyUrl: vars.verifyUrl ?? '',
      resetUrl: vars.resetUrl ?? '',
      appName: config.brevoSenderName,
    };
    return {
      subject: renderTemplate(subjectSource, values, false).slice(0, 200),
      html: renderTemplate(htmlSource, values, true),
      text: renderTemplate(textSource, values, false),
    };
  }

  async send(key: TemplateKey, to: string, vars: MailVars): Promise<void> {
    const config = readConfig();
    if (config.isProduction && !config.brevoApiKey) {
      throw new Error('Production e-posta Brevo olmadan gönderilmez.');
    }
    const rendered = await this.render(key, vars);
    const fingerprint = createHash('sha256').update(`${key}:${to}:${rendered.text}`).digest('hex').slice(0, 24);
    const dedupeKey = `${key}:${to.trim().toLowerCase()}:${fingerprint}`;
    const expiresAt = new Date(Date.now() + config.emailVerificationTtlMinutes * 60_000);
    await this.prisma.mailJob.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        dedupeKey,
        toEmail: to.trim().toLowerCase(),
        subject: rendered.subject,
        textBody: rendered.text,
        htmlBody: rendered.html,
        expiresAt,
      },
    });
    if (!config.isProduction && !config.brevoApiKey && (vars.verifyUrl || vars.resetUrl)) {
      this.devHints.set(to.trim().toLowerCase(), {
        code: vars.code ?? '',
        verifyUrl: vars.verifyUrl || vars.resetUrl || '',
      });
    }
    if (!config.isProduction) await this.processDue(5);
  }

  async processDue(limit = 10): Promise<number> {
    const now = new Date();
    await this.prisma.mailJob.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED', lastError: 'expired' },
    });
    await this.prisma.mailJob.updateMany({
      where: { status: 'SENDING', leaseUntil: { lt: now }, attempts: { lt: 5 } },
      data: { status: 'PENDING', leaseUntil: null },
    });
    const sentToday = await this.prisma.mailJob.count({
      where: { status: 'SENT', sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    if (sentToday >= 200) return 0;
    const jobs = await this.prisma.mailJob.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: now }, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let sent = 0;
    for (const job of jobs) {
      const lease = await this.prisma.mailJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'SENDING', leaseUntil: new Date(Date.now() + 60_000), attempts: { increment: 1 } },
      });
      if (lease.count !== 1) continue;
      try {
        const config = readConfig();
        if (config.isProduction && !config.brevoApiKey) throw new Error('brevo missing');
        const provider: MailProvider = config.brevoApiKey ? new BrevoMailProvider(config) : new ConsoleMailProvider();
        await provider.send({ to: job.toEmail, subject: job.subject, html: job.htmlBody, text: job.textBody });
        await this.prisma.mailJob.update({
          where: { id: job.id },
          data: { status: 'SENT', sentAt: new Date(), leaseUntil: null, lastError: null },
        });
        sent += 1;
      } catch {
        const attempts = job.attempts + 1;
        await this.prisma.mailJob.update({
          where: { id: job.id },
          data: {
            status: attempts >= 5 ? 'FAILED' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 15 * 60_000)),
            leaseUntil: null,
            lastError: 'provider error',
          },
        });
      }
    }
    return sent;
  }

  preview(key: string, vars: MailVars): Promise<{ subject: string; html: string; text: string }> {
    if (!isTemplateKey(key)) {
      return Promise.reject(new Error('unknown template'));
    }
    return this.render(key, vars);
  }
}
