import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { UPLOAD_THROTTLE_KEY, UploadThrottleOptions } from '../decorators/upload-throttle.decorator';

@Injectable()
export class UploadThrottleGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const uploadThrottleOptions = this.reflector.get<UploadThrottleOptions>(
      UPLOAD_THROTTLE_KEY,
      context.getHandler(),
    );

    if (uploadThrottleOptions) {
      // Override default throttle options for this endpoint
      const { ttl, limit } = uploadThrottleOptions;

      const request = context.switchToHttp().getRequest();
      const key = this.generateKey(context, request.user?.id || request.ip);

      const { totalHits } = await this.storageService.increment(key, ttl, limit, ttl, 'upload');

      if (totalHits > limit) {
        throw new ThrottlerException(
          `Upload rate limit exceeded. Maximum ${limit} uploads per ${ttl / 1000} seconds.`
        );
      }

      return true;
    }

    // Fall back to default throttle behavior
    return super.canActivate(context);
  }

  protected generateKey(context: ExecutionContext, suffix: string): string {
    const prefix = 'upload_throttle';
    return `${prefix}:${suffix}`;
  }
}
