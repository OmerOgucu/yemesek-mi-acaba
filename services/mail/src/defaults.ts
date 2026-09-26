export const TEMPLATE_KEYS = [
  'email_verification',
  'welcome',
  'password_reset',
  'press_inquiry',
  'legal_takedown_ack',
  'moderation_decision',
  'verify_reminder',
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateBody = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

export const TEMPLATE_DEFAULTS: Record<TemplateKey, TemplateBody> = {
  email_verification: {
    subject: 'E-posta doğrulama kodun',
    htmlBody:
      '<p>Merhaba {{displayName}},</p><p>Doğrulama kodun: <strong>{{code}}</strong></p><p><a href="{{verifyUrl}}">E-postayı doğrula</a></p>',
    textBody: 'Merhaba {{displayName}}, doğrulama kodun {{code}}. Bağlantı: {{verifyUrl}}',
  },
  welcome: {
    subject: 'Aramıza hoş geldin',
    htmlBody: '<p>Merhaba {{displayName}}, e-postan doğrulandı. Artık mekan ekleyebilir ve şikayet bırakabilirsin.</p>',
    textBody: 'Merhaba {{displayName}}, e-postan doğrulandı. Artık mekan ekleyebilir ve şikayet bırakabilirsin.',
  },
  password_reset: {
    subject: 'Parola sıfırlama',
    htmlBody: '<p>Merhaba {{displayName}},</p><p><a href="{{resetUrl}}">Yeni parola belirle</a></p><p>Bu bağlantı kısa süre geçerlidir.</p>',
    textBody: 'Merhaba {{displayName}}, yeni parola bağlantın: {{resetUrl}}',
  },
  press_inquiry: {
    subject: 'Basın sorun alındı',
    htmlBody: '<p>Merhaba {{displayName}}, sorun ulaştı. {{appName}} basın masası dönüş yapacak.</p>',
    textBody: 'Merhaba {{displayName}}, basın sorun ulaştı.',
  },
  legal_takedown_ack: {
    subject: 'Kaldırma bildirimi alındı',
    htmlBody: '<p>Merhaba {{displayName}}, kaldırma bildirimin alındı. İnceleme sonucunu ayrıca yazarız.</p>',
    textBody: 'Merhaba {{displayName}}, kaldırma bildirimin alındı.',
  },
  moderation_decision: {
    subject: 'Şikayet incelemesi',
    htmlBody: '<p>Merhaba {{displayName}}, bir şikayet kaydın incelendi. Durum: {{code}}.</p>',
    textBody: 'Merhaba {{displayName}}, şikayet kaydın incelendi. Durum: {{code}}.',
  },
  verify_reminder: {
    subject: 'E-postanı doğrulamayı unutma',
    htmlBody: '<p>Merhaba {{displayName}}, hesabını kullanmak için e-postanı doğrula: <a href="{{verifyUrl}}">Doğrula</a></p>',
    textBody: 'Merhaba {{displayName}}, doğrulama bağlantın: {{verifyUrl}}',
  },
};

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}
