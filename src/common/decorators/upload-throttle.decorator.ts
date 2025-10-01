import { SetMetadata } from '@nestjs/common';

export const UPLOAD_THROTTLE_KEY = 'upload_throttle';

export interface UploadThrottleOptions {
  ttl: number; // Time to live in milliseconds
  limit: number; // Max requests per TTL
}

export const UploadThrottle = (options: UploadThrottleOptions) =>
  SetMetadata(UPLOAD_THROTTLE_KEY, options);
