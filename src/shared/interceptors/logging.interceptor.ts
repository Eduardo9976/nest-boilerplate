import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { RequestContext } from './request-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = crypto.randomUUID();
    const start = Date.now();

    return new Observable((subscriber) => {
      RequestContext.run({ requestId }, () => {
        next
          .handle()
          .pipe(
            tap({
              next: () => {
                const res = context.switchToHttp().getResponse<Response>();
                process.stdout.write(
                  JSON.stringify({
                    requestId,
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${Date.now() - start}ms`,
                    context: context.getClass().name,
                    timestamp: new Date().toISOString(),
                  }) + '\n',
                );
              },
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}
