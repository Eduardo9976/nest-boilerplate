import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ValidationException } from '../exceptions/validation.exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationException(
        'Validation failed',
        result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      );
    }
    return result.data;
  }
}
