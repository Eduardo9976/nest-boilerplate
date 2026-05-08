import { Injectable } from '@nestjs/common';
import { FindUserByEmailUseCase } from '../../users/use-cases/find-user-by-email.use-case';
import { ValidatePasswordUseCase } from '../../users/use-cases/validate-password.use-case';
import { TokenIssuerService, TokenPair } from './token-issuer.service';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';

@Injectable()
export class JwtLoginUseCase {
  constructor(
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly validatePassword: ValidatePasswordUseCase,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(email: string, password: string): Promise<TokenPair> {
    const user = await this.findUserByEmail.execute(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    await this.validatePassword.execute(user, password);
    return this.tokenIssuer.issueTokenPair(user.id);
  }
}
