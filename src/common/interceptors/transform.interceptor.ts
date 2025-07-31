import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Helpers } from '../utils/helpers';
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
        const cleanData = Helpers.removeNullFields(data);
        if (cleanData && typeof cleanData === 'object' && 'status' in cleanData) {
          return cleanData;
        }
        return {
          data: cleanData,
          status: true,
          message: 'Success',
        };
      }),
    );
  }
}