import { ServiceUnavailableException } from '@nestjs/common';
import type { AppConfig } from '@yemesek/config';
import type { MailProvider, OutboundMail } from './mail.provider';

export class BrevoMailProvider implements MailProvider {
  constructor(private readonly config: AppConfig) {}

  async send(mail: OutboundMail): Promise<void> {
    const apiKey = this.config.brevoApiKey;
    if (!apiKey) throw new ServiceUnavailableException('E-posta gönderilemedi.');
    const endpoint = process.env.BREVO_API_URL?.trim() || 'https://api.brevo.com/v3/smtp/email';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        sender: { email: this.config.brevoSenderEmail, name: this.config.brevoSenderName },
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('E-posta gönderilemedi.');
    }
  }
}
