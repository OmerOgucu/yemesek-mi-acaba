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
    const rendered = await this.render(key, vars);
    const provider: MailProvider = config.brevoApiKey ? new BrevoMailProvider(config) : new ConsoleMailProvider();
    await provider.send({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
    if (!config.isProduction && !config.brevoApiKey && vars.code && vars.verifyUrl) {
      console.info(`[mail:dev] to=${to} code=${vars.code} verifyUrl=${vars.verifyUrl}`);
      this.devHints.set(to.trim().toLowerCase(), { code: vars.code, verifyUrl: vars.verifyUrl });
    }
  }

  preview(key: string, vars: MailVars): Promise<{ subject: string; html: string; text: string }> {
    if (!isTemplateKey(key)) {
      return Promise.reject(new Error('unknown template'));
    }
    return this.render(key, vars);
  }
}
