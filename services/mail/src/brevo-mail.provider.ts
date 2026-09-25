import { ServiceUnavailableException } from '@nestjs/common';
import type { AppConfig } from '@yemesek/config';
import type { MailProvider, OutboundMail } from './mail.provider';

export class BrevoMailProvider implements MailProvider {
  constructor(private readonly config: AppConfig) {}

  async send(mail: OutboundMail): Promise<void> {
    const apiKey = this.config.brevoApiKey;
    if (!apiKey) throw new ServiceUnavailableException('E-posta gönderilemedi.');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
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
