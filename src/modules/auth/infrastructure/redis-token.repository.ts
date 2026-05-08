import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.module';

export const REDIS_TOKEN_REPOSITORY = Symbol('REDIS_TOKEN_REPOSITORY');

export interface IRedisTokenRepository {
  store(userId: string, tokenId: string, ttlSeconds: number): Promise<void>;
  verify(userId: string, tokenId: string): Promise<boolean>;
  delete(userId: string, tokenId: string): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}

@Injectable()
export class RedisTokenRepository implements IRedisTokenRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async store(userId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`refresh:${userId}:${tokenId}`, '1', 'EX', ttlSeconds);
  }

  async verify(userId: string, tokenId: string): Promise<boolean> {
    const result = await this.redis.get(`refresh:${userId}:${tokenId}`);
    return result !== null;
  }

  async delete(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}:${tokenId}`);
  }

  async deleteAll(userId: string): Promise<void> {
    const pattern = `refresh:${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
