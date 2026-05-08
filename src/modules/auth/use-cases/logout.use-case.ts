import { Inject, Injectable } from '@nestjs/common';
import {
  IRedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from '../infrastructure/redis-token.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REDIS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IRedisTokenRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.tokenRepo.deleteAll(userId);
  }
}
