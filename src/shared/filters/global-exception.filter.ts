import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { ConflictException } from '../exceptions/conflict.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { UnauthorizedException } from '../exceptions/unauthorized.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { RequestContext } from '../interceptors/request-context';

interface HttpExceptionBody {
  message?: string;
  details?: unknown[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = RequestContext.get()?.requestId ?? 'unknown';
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body = (typeof raw === 'string' ? { message: raw } : raw) as HttpExceptionBody;
      response.status(status).json({
        message: body.message,
        code: this.statusToCode(status),
        details: body.details ?? [],
        timestamp,
        requestId,
      });
      return;
    }

    if (exception instanceof AppException) {
      response.status(this.appExceptionToStatus(exception)).json({
        message: exception.message,
        code: exception.code,
        details: exception instanceof ValidationException ? exception.details : [],
        timestamp,
        requestId,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      details: [],
      timestamp,
      requestId,
    });
  }

  private appExceptionToStatus(e: AppException): number {
    if (e instanceof NotFoundException) return HttpStatus.NOT_FOUND;
    if (e instanceof UnauthorizedException) return HttpStatus.UNAUTHORIZED;
    if (e instanceof ConflictException) return HttpStatus.CONFLICT;
    if (e instanceof ValidationException) return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
