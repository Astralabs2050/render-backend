import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { 
  configureServer, 
  configureStaticAssets, 
  configureGlobalMiddleware, 
  shutdown
} from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  configureServer(app);
  configureStaticAssets(app, logger);
  configureGlobalMiddleware(app);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on port: ${port}`);
  
  shutdown(app, logger);
}

bootstrap();