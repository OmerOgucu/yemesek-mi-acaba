import 'reflect-metadata';
import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL tanımlı değil.');
  }
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
