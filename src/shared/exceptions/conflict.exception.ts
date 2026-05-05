import { AppException } from './app.exception';
export class ConflictException extends AppException {
  readonly code = 'CONFLICT';
}
