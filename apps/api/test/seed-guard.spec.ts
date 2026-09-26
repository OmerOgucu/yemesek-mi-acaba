import { assertProductionSeedAllowed } from '../../../packages/database/src/seed-guard';

describe('production seed guard', () => {
  it('refuses every production seed, including the old override flag', () => {
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'production' })).toThrow(/demo seed/);
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' } as { NODE_ENV: string })).toThrow(/demo seed/);
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'development' })).not.toThrow();
  });
});