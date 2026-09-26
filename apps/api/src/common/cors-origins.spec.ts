import { resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('keeps localhost when the env list is empty', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: '' })).toContain('http://localhost:3000');
    expect(resolveCorsOrigins({})).not.toContain('https://yemesekmi.com');
  });

  it('uses the comma-separated production list and drops blanks', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: ' https://yemesekmi.com, https://www.yemesekmi.com ' })).toEqual([
      'https://yemesekmi.com',
      'https://www.yemesekmi.com',
    ]);
  });
});
