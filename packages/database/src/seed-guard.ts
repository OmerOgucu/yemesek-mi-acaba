export function assertProductionSeedAllowed(env: { NODE_ENV?: string } = process.env): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production iken demo seed çalışmaz. ALLOW_PRODUCTION_SEED bu yasağı açmaz.');
  }
}
