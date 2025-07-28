import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { ZodConfigService } from './zod-config.service';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: configValidationSchema.validate,
    }),
  ],
  providers: [ZodConfigService],
  exports: [ZodConfigService],
})
export class ConfigModule {}