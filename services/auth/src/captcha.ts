import { BadRequestException } from '@nestjs/common';

export async function assertHuman(input: { company?: string; captchaToken?: string }): Promise<void> {
  if (input.company?.trim()) {
    throw new BadRequestException('İstek reddedildi.');
  }
  const provider = (process.env.CAPTCHA_PROVIDER ?? 'none').trim().toLowerCase();
  if (process.env.NODE_ENV === 'test' || provider === '' || provider === 'none') return;
  if (provider !== 'turnstile' && provider !== 'hcaptcha') {
    throw new BadRequestException('Doğrulama sağlayıcısı tanınmıyor.');
  }
  if (!input.captchaToken?.trim()) throw new BadRequestException('Doğrulama gerekli.');
  const secret = provider === 'hcaptcha' ? process.env.HCAPTCHA_SECRET : process.env.TURNSTILE_SECRET;
  if (!secret?.trim()) throw new BadRequestException('Doğrulama yapılandırılmamış.');
  const endpoint =
    provider === 'hcaptcha'
      ? 'https://hcaptcha.com/siteverify'
      : 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: input.captchaToken }),
  });
  const body = (await response.json()) as { success?: boolean };
  if (!body.success) throw new BadRequestException('Doğrulama geçersiz.');
}
