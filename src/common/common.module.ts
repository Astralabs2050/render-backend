import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';

import { EmailService } from './services/email.service';
import { CloudinaryService } from './services/cloudinary.service';
import { UploadController } from './controllers/upload.controller';
@Global()
@Module({
  controllers: [UploadController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    EmailService,
    CloudinaryService,
  ],
  exports: [EmailService, CloudinaryService],
})
export class CommonModule {}