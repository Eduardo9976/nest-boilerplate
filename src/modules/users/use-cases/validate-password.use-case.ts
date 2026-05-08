import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '../domain/user.entity';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';

@Injectable()
export class ValidatePasswordUseCase {
  async execute(user: User, plainPassword: string): Promise<void> {
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses social login');
    }
    const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
