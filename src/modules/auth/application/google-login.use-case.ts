import { Injectable } from '@nestjs/common';
import { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case';
import { CreateUserUseCase } from '../../users/application/use-cases/create-user.use-case';
import { JwtLoginUseCase, TokenPair } from './jwt-login.use-case';

export interface GoogleProfile {
  googleId: string;
  email: string;
}

@Injectable()
export class GoogleLoginUseCase {
  constructor(
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly jwtLoginUseCase: JwtLoginUseCase,
  ) {}

  async execute(profile: GoogleProfile): Promise<TokenPair> {
    let user = await this.findUserByEmail.execute(profile.email);
    if (!user) {
      user = await this.createUser.execute({
        email: profile.email,
        googleId: profile.googleId,
      });
    }
    return this.jwtLoginUseCase.issueTokenPair(user.id);
  }
}
