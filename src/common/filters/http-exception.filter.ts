import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';
    const errorResponse = {
      status: false,
      message,
      error: exception.response?.message || exception.message || null,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(errorResponse)}`,
      exception.stack,
    );
    response.status(status).json(errorResponse);
  }
}