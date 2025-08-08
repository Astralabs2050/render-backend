import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export function configureServer(app: NestExpressApplication) {
  app.getHttpServer().timeout = 30000;
  app.getHttpServer().keepAliveTimeout = 5000;
  app.getHttpServer().headersTimeout = 6000;
  app.enableCors();
  
  // Configure Express for large file uploads
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));
}

export function configureStaticAssets(app: NestExpressApplication, logger: Logger) {
  const staticPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, '..', 'public')  
    : join(process.cwd(), 'public');   
  app.useStaticAssets(staticPath);
  logger.log(`Static assets served from: ${staticPath}`);
}

export function configureGlobalMiddleware(app: NestExpressApplication) {
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
}

export function shutdown(app: NestExpressApplication, logger: Logger) {
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down');
    await app.close();
  });
  
  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down');
    await app.close();
  });
}