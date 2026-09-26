import { MemoryRateLimiter } from './memory-rate-limiter';

describe('MemoryRateLimiter', () => {
  it('allows a burst up to the max and then blocks inside the window', () => {
    const limiter = new MemoryRateLimiter(3, 60_000);
    expect(limiter.allow('1.2.3.4', 1_000)).toBe(true);
    expect(limiter.allow('1.2.3.4', 1_100)).toBe(true);
    expect(limiter.allow('1.2.3.4', 1_200)).toBe(true);
    expect(limiter.allow('1.2.3.4', 1_300)).toBe(false);
  });

  it('resets after the window and isolates keys', () => {
    const limiter = new MemoryRateLimiter(1, 1_000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 500)).toBe(false);
    expect(limiter.allow('b', 500)).toBe(true);
    expect(limiter.allow('a', 1_000)).toBe(true);
  });

  it('reports a block without consuming another hit', () => {
    const limiter = new MemoryRateLimiter(1, 1_000);
    expect(limiter.blocked('a', 0)).toBe(false);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.blocked('a', 10)).toBe(true);
    limiter.clear('a');
    expect(limiter.blocked('a', 10)).toBe(false);
  });
});
