export const TEMPLATE_KEYS = ['email_verification', 'welcome', 'password_reset'] as const;
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
    htmlBody:
      '<p>Merhaba {{displayName}}, parola sıfırlama bu sürümde henüz gönderilmez. Şablon yayın öncesi hazır durur.</p>',
    textBody: 'Merhaba {{displayName}}, parola sıfırlama bu sürümde henüz gönderilmez.',
  },
};

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}
