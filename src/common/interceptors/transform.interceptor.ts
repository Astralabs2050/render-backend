import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  status: boolean;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // If data is already formatted, return it as is
        if (data && typeof data === 'object' && 'status' in data) {
          return data;
        }
        
        // Otherwise, format the response
        return {
          data,
          status: true,
          message: 'Success',
        };
      }),
    );
  }
}