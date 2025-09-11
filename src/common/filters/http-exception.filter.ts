import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  
  catch(exception: any, host: ArgumentsHost) {
    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
    
    // Check if response has already been sent
    if (response.headersSent) {
      this.logger.error(
        `Headers already sent for ${request.method} ${request.url}`,
        exception.stack,
      );
      return;
    }
      
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
        error: exception.response?.error || exception.response?.message || exception.message || message,
        path: request.url,
        timestamp: new Date().toISOString(),
      };
      
      // Always log the error
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${message}`,
        exception.stack,
      );
      
      // Check if we can send a response
      if (this.canSendResponse(response)) {
        this.sendErrorResponse(response, status, errorResponse);
      } else {
        this.logger.warn(
          `Cannot send error response - response already committed for ${request.method} ${request.url}`
        );
      }
    } catch (filterError) {
      // If the filter itself fails, just log it
      this.logger.error(`Exception filter error: ${filterError.message}`);
    }
  }
  
  private canSendResponse(response: Response): boolean {
    return !response.headersSent && 
           !response.writableEnded && 
           !response.destroyed &&
           response.writable;
  }
  
  private sendErrorResponse(response: Response, status: number, errorResponse: any): void {
    try {
      // Double-check before sending
      if (this.canSendResponse(response)) {
        response.status(status).json(errorResponse);
      }
    } catch (sendError) {
      this.logger.error(`Failed to send error response: ${sendError.message}`);
    }
  }
}