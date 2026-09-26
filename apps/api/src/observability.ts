export async function initObservability(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  const sentry = await import('@sentry/node');
  sentry.init({ dsn, tracesSampleRate: 0, sendDefaultPii: false });
}
