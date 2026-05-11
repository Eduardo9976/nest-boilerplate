import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
  });

  it('wraps a value in { data: value }', (done) => {
    const next = { handle: () => of({ id: '1' }) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1' } });
      done();
    });
  });

  it('maps undefined to { data: null }', (done) => {
    const next = { handle: () => of(undefined) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('maps null to { data: null }', (done) => {
    const next = { handle: () => of(null) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('wraps an array in { data: array }', (done) => {
    const next = { handle: () => of([1, 2, 3]) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: [1, 2, 3] });
      done();
    });
  });
});
