import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case';
import { ValidatePasswordUseCase } from '../../users/application/use-cases/validate-password.use-case';
import {
  IRedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from '../infrastructure/redis-token.repository';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtLoginUseCase {
  constructor(
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly validatePassword: ValidatePasswordUseCase,
    private readonly jwtService: JwtService,
    @Inject(REDIS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IRedisTokenRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(email: string, password: string): Promise<TokenPair> {
    const user = await this.findUserByEmail.execute(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    await this.validatePassword.execute(user, password);
    return this.issueTokenPair(user.id);
  }

  async issueTokenPair(userId: string): Promise<TokenPair> {
    const tokenId = crypto.randomUUID();

    const accessTtl = this.parseTtl(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    );
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const ttlSeconds = this.parseTtl(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, tokenId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: ttlSeconds,
      },
    );

    await this.tokenRepo.store(userId, tokenId, ttlSeconds);
    return { accessToken, refreshToken };
  }

  private parseTtl(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800;
    const value = parseInt(match[1], 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[match[2]] ?? 1);
  }
}
