import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { readConfig } from '@yemesek/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { resolveCorsOrigins } from './common/cors-origins';
import { createValidationPipe } from './common/validation';

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
    bodyParser: false,
  });
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '32kb' });
  const config = readConfig();
  const origins = resolveCorsOrigins();
  if (config.isProduction && !process.env.CORS_ORIGINS?.trim()) {
    console.warn('CORS_ORIGINS boş. Production için https://yemesekmiacaba.com yazılmalı. Şu an yalnızca localhost kabul edilir.');
  }
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? '0');
  if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
    throw new Error('TRUST_PROXY_HOPS 0 ile 5 arasında bir tam sayı olmalı.');
  }
  app.set('trust proxy', hops);
  app.use((_req: Request, res: Response, next: () => void) => {
    res.setHeader('X-Yemesek-Project', 'yemesek');
    const release = process.env.RELEASE_TAG || '';
    if (/^[A-Za-z0-9._-]{1,40}$/.test(release)) res.setHeader('X-Yemesek-Release', release);
    next();
  });
  app.use('/uploads', (_req: Request, res: Response) => {
    res.sendStatus(404);
  });
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Api-Key', 'x-app-version', 'x-ios-build', 'x-android-build'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  return app;
}
