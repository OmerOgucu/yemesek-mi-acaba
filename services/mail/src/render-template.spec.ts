import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
  it('escapes html placeholders and leaves text plain', () => {
    const source = 'Merhaba {{displayName}} {{code}}';
    expect(renderTemplate(source, { displayName: '<b>Ada</b>', code: '123456' }, true)).toBe(
      'Merhaba &lt;b&gt;Ada&lt;/b&gt; 123456',
    );
    expect(renderTemplate(source, { displayName: 'Ada', code: '123456' }, false)).toBe('Merhaba Ada 123456');
  });

  it('inserts the password reset url into text', () => {
    const text = renderTemplate('bağlantın: {{resetUrl}}', { resetUrl: 'https://web.yemesek.test/sifre-sifirla?token=abc' }, false);
    expect(text).toContain('token=abc');
  });
});
