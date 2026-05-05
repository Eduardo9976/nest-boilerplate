import { AppException } from './app.exception';
export class UnauthorizedException extends AppException {
  readonly code = 'UNAUTHORIZED';
}
