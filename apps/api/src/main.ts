import 'reflect-metadata';
import { assertLaunchConfig, readConfig } from '@yemesek/config';
import { createApp } from './create-app';
import { initObservability } from './observability';

async function bootstrap(): Promise<void> {
  await initObservability();
  const config = readConfig();
  assertLaunchConfig();
  const app = await createApp();
  await app.listen(config.port);
}

void bootstrap();
