import { mkdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { createValidationPipe } from './common/validation';
import { uploadsRoot } from '@yemesek/evidence';

const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
    bodyParser: false,
  });
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '32kb' });
  const uploads = uploadsRoot();
  mkdirSync(uploads, { recursive: true });
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
    origin: LOCAL_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Api-Key'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  return app;
}
