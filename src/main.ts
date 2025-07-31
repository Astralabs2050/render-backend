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
  app.getHttpServer().timeout = 30000;
  app.getHttpServer().keepAliveTimeout = 5000;
  app.getHttpServer().headersTimeout = 6000;
  app.enableCors();
  const staticPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, '..', 'public')  
    : join(process.cwd(), 'public');   
  app.useStaticAssets(staticPath);
  logger.log(`Static assets served from: ${staticPath}`);
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
  logger.log(`Application is running on port: ${port}`);
  
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received, shutting down gracefully');
    app.close();
  });
  
  process.on('SIGINT', () => {
    logger.log('SIGINT received, shutting down gracefully');
    app.close();
  });
}
bootstrap();