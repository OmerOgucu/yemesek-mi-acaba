import { resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('keeps localhost when the env list is empty', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: '' })).toContain('http://localhost:3000');
    expect(resolveCorsOrigins({})).not.toContain('https://yemesekmiacaba.com');
  });

  it('uses the comma-separated production list and drops blanks', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: ' https://yemesekmiacaba.com, https://www.yemesekmiacaba.com ' })).toEqual([
      'https://yemesekmiacaba.com',
      'https://www.yemesekmiacaba.com',
    ]);
  });
});
