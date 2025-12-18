import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';

import { EmailService } from './services/email.service';
import { CloudinaryService } from './services/cloudinary.service';
import { PaystackService } from './services/paystack.service';
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
    PaystackService,
  ],
  exports: [EmailService, CloudinaryService, PaystackService],
})
export class CommonModule {}