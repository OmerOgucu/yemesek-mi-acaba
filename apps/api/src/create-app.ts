import { mkdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { readConfig } from '@yemesek/config';
import { uploadsRoot } from '@yemesek/evidence';
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
  const uploads = uploadsRoot();
  mkdirSync(uploads, { recursive: true });
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    if (!req.path || req.path === '/' || req.path.endsWith('/')) {
      res.sendStatus(404);
      return;
    }
    next();
  });
  app.useStaticAssets(uploads, {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
    redirect: false,
    fallthrough: true,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
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
