import type { MailProvider, OutboundMail } from './mail.provider';

export class ConsoleMailProvider implements MailProvider {
  async send(mail: OutboundMail): Promise<void> {
    console.info(`[mail:dev] to=${mail.to} subject=${mail.subject}`);
  }
}
