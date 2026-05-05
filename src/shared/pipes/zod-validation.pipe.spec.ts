import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ email: z.string().email(), age: z.number().min(0) });
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('returns parsed value on valid input', () => {
    const result = pipe.transform({ email: 'a@b.com', age: 25 });
    expect(result).toEqual({ email: 'a@b.com', age: 25 });
  });

  it('throws BadRequestException on invalid input', () => {
    expect(() => pipe.transform({ email: 'not-an-email', age: -1 })).toThrow(BadRequestException);
  });

  it('includes field-level details in error', () => {
    try {
      pipe.transform({ email: 'bad', age: 0 });
    } catch (e) {
      const body = (e as BadRequestException).getResponse() as {
        details: Array<{ field: string; message: string }>;
      };
      expect(body.details).toBeDefined();
      expect(body.details.length).toBeGreaterThan(0);
      expect(body.details[0]).toHaveProperty('field');
      expect(body.details[0]).toHaveProperty('message');
    }
  });
});
