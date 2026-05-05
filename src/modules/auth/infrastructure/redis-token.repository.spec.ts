import type { Redis } from 'ioredis';
import { RedisTokenRepository } from './redis-token.repository';

describe('RedisTokenRepository', () => {
  let repo: RedisTokenRepository;
  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new RedisTokenRepository(mockRedis as unknown as Redis);
  });

  it('stores a token with the correct key and TTL', async () => {
    await repo.store('user-1', 'token-1', 600);
    expect(mockRedis.set).toHaveBeenCalledWith('refresh:user-1:token-1', '1', 'EX', 600);
  });

  it('returns true when token exists', async () => {
    mockRedis.get.mockResolvedValue('1');
    const result = await repo.verify('user-1', 'token-1');
    expect(result).toBe(true);
  });

  it('returns false when token does not exist', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await repo.verify('user-1', 'token-1');
    expect(result).toBe(false);
  });

  it('deletes a specific token', async () => {
    await repo.delete('user-1', 'token-1');
    expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-1:token-1');
  });

  it('deletes all tokens for a user', async () => {
    mockRedis.keys.mockResolvedValue(['refresh:user-1:t1', 'refresh:user-1:t2']);
    await repo.deleteAll('user-1');
    expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-1:t1', 'refresh:user-1:t2');
  });

  it('does nothing when no tokens exist for deleteAll', async () => {
    mockRedis.keys.mockResolvedValue([]);
    await repo.deleteAll('user-1');
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});
