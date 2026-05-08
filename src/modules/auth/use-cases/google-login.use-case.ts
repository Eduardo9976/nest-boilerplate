import { Injectable } from '@nestjs/common';
import { FindUserByEmailUseCase } from '../../users/use-cases/find-user-by-email.use-case';
import { CreateUserUseCase } from '../../users/use-cases/create-user.use-case';
import { TokenIssuerService, TokenPair } from './token-issuer.service';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

export interface GoogleProfile {
  googleId: string;
  email: string;
}

@Injectable()
export class GoogleLoginUseCase {
  constructor(
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(profile: GoogleProfile): Promise<TokenPair> {
    let user = await this.findUserByEmail.execute(profile.email);
    if (!user) {
      try {
        user = await this.createUser.execute({
          email: profile.email,
          googleId: profile.googleId,
        });
      } catch (err) {
        if (err instanceof ConflictException) {
          user = await this.findUserByEmail.execute(profile.email);
        } else {
          throw err;
        }
      }
    }
    return this.tokenIssuer.issueTokenPair(user!.id);
  }
}
