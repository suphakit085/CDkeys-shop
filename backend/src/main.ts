import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const uploadRoot = join(process.cwd(), 'uploads');
  for (const folder of ['slips', 'banners', 'settings']) {
    mkdirSync(join(uploadRoot, folder), { recursive: true });
  }

  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
    credentials: true,
  });

  // Serve static uploaded files
  app.useStaticAssets(uploadRoot, {
    prefix: '/uploads/',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  app
    .getHttpAdapter()
    .get('/health', (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json({
        status: 'ok',
        service: 'cdkeys-backend',
        timestamp: new Date().toISOString(),
      });
    });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
void bootstrap();
