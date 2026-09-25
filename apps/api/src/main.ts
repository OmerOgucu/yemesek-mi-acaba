import 'reflect-metadata';
import { readConfig } from '@yemesek/config';
import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  const config = readConfig();
  const app = await createApp();
  await app.listen(config.port);
}

void bootstrap();
