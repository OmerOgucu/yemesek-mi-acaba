import 'reflect-metadata';
import { assertLaunchConfig, readConfig } from '@yemesek/config';
import { createApp } from './create-app';
import { initObservability } from './observability';

async function bootstrap(): Promise<void> {
  await initObservability();
  const config = readConfig();
  assertLaunchConfig(process.env, process.env.RUN_WORKER === 'true' ? 'worker' : 'api');
  const app = await createApp();
  await app.listen(config.port);
}

void bootstrap();
