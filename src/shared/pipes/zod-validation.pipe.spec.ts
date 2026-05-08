import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { ValidationException } from '../exceptions/validation.exception';

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

  it('throws ValidationException on invalid input', () => {
    expect(() => pipe.transform({ email: 'not-an-email', age: -1 })).toThrow(ValidationException);
  });

  it('includes field-level details in error', () => {
    try {
      pipe.transform({ email: 'bad', age: 0 });
    } catch (e) {
      const err = e as ValidationException;
      expect(err.details).toBeDefined();
      expect(err.details.length).toBeGreaterThan(0);
      expect(err.details[0]).toHaveProperty('field');
      expect(err.details[0]).toHaveProperty('message');
    }
  });
});
