import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export function configureServer(app: NestExpressApplication) {
  app.getHttpServer().timeout = 30000;
  app.getHttpServer().keepAliveTimeout = 5000;
  app.getHttpServer().headersTimeout = 6000;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const isProduction = process.env.NODE_ENV === 'production';

  // Configure Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", frontendUrl, "https:", "wss:", "ws:"],
        frameSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        frontendUrl,
        'http://localhost:3001',
        'http://localhost:3000',
        'https://render-backend-drm4.onrender.com',
      ];
      
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else if (!isProduction) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  });

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
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
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