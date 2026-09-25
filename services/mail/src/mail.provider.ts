export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface MailProvider {
  send(mail: OutboundMail): Promise<void>;
}
