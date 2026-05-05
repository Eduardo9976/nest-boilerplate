import { Inject, Injectable } from '@nestjs/common';
import {
  IRedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from '../infrastructure/redis-token.repository';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';
import { JwtLoginUseCase, TokenPair } from './jwt-login.use-case';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REDIS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IRedisTokenRepository,
    private readonly jwtLoginUseCase: JwtLoginUseCase,
  ) {}

  async execute(userId: string, tokenId: string): Promise<TokenPair> {
    const isValid = await this.tokenRepo.verify(userId, tokenId);
    if (!isValid) throw new UnauthorizedException('Refresh token is invalid or expired');
    await this.tokenRepo.delete(userId, tokenId);
    return this.jwtLoginUseCase.issueTokenPair(userId);
  }
}
