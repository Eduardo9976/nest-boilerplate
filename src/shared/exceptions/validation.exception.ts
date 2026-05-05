import { AppException } from './app.exception';
export class ValidationException extends AppException {
  readonly code = 'VALIDATION_ERROR';
  constructor(
    message: string,
    public readonly details: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
  }
}
