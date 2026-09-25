import { assertProductionSeedAllowed } from '../../../packages/database/src/seed-guard';

describe('production seed guard', () => {
  it('refuses a production seed unless the explicit flag is set', () => {
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'production' })).toThrow(/ALLOW_PRODUCTION_SEED/);
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' })).not.toThrow();
    expect(() => assertProductionSeedAllowed({ NODE_ENV: 'development' })).not.toThrow();
  });
});