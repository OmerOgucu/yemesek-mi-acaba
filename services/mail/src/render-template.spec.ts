import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
  it('escapes html placeholders and leaves text plain', () => {
    const source = 'Merhaba {{displayName}} {{code}}';
    expect(renderTemplate(source, { displayName: '<b>Ada</b>', code: '123456' }, true)).toBe(
      'Merhaba &lt;b&gt;Ada&lt;/b&gt; 123456',
    );
    expect(renderTemplate(source, { displayName: 'Ada', code: '123456' }, false)).toBe('Merhaba Ada 123456');
  });
});
