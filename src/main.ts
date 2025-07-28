import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set global timeout to 60 seconds
  app.getHttpServer().timeout = 60000;

  // Enable CORS
  app.enableCors();

  // Serve static files - works for both dev and production
  const staticPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, '..', 'public')  // Production: dist/../public
    : join(process.cwd(), 'public');   // Development: project-root/public
  
  app.useStaticAssets(staticPath);
  logger.log(`Static assets served from: ${staticPath}`);

  // Global pipes, filters, and interceptors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Test pages available at: http://localhost:${port}/`);
}

bootstrap();