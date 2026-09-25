export function assertProductionSeedAllowed(env: { NODE_ENV?: string; ALLOW_PRODUCTION_SEED?: string } = process.env): void {
  if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      'NODE_ENV=production iken seed kapalıdır. Bu komut kullanıcıları, mekanları ve şikayetleri siler. Yalnızca boş bir deneme veritabanında ALLOW_PRODUCTION_SEED=true ile açılır.',
    );
  }
}
