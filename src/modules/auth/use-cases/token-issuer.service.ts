import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IRedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from '../infrastructure/redis-token.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenIssuerService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IRedisTokenRepository,
  ) {}

  async issueTokenPair(userId: string): Promise<TokenPair> {
    const tokenId = crypto.randomUUID();

    const accessTtl = this.parseTtl(
      this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    );
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const refreshTtl = this.parseTtl(
      this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, tokenId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );

    await this.tokenRepo.store(userId, tokenId, refreshTtl);
    return { accessToken, refreshToken };
  }

  private parseTtl(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    const value = parseInt(match[1], 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[match[2]];
  }
}
