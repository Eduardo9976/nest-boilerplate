import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { JwtLoginUseCase } from './jwt-login.use-case';
import type { FindUserByEmailUseCase } from '../../users/use-cases/find-user-by-email.use-case';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';
import type { User } from '../../users/domain/user.entity';

describe('JwtLoginUseCase', () => {
  let useCase: JwtLoginUseCase;
  const mockFindByEmail = { execute: jest.fn() };
  const mockValidatePassword = { execute: jest.fn() };
  const mockJwtService = { sign: jest.fn().mockReturnValue('signed-token') };
  const mockTokenRepo = {
    store: jest.fn(),
    verify: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return map[key];
    }),
  };

  const user: User = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hash',
    googleId: null,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new JwtLoginUseCase(
      mockFindByEmail as unknown as FindUserByEmailUseCase,
      mockValidatePassword,
      mockJwtService as unknown as JwtService,
      mockTokenRepo,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('returns token pair on valid credentials', async () => {
    mockFindByEmail.execute.mockResolvedValue(user);
    mockValidatePassword.execute.mockResolvedValue(undefined);

    const result = await useCase.execute('test@example.com', 'password');

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(mockTokenRepo.store).toHaveBeenCalledWith(
      'user-uuid',
      expect.any(String),
      expect.any(Number),
    );
  });

  it('throws UnauthorizedException when user not found', async () => {
    mockFindByEmail.execute.mockResolvedValue(null);

    await expect(useCase.execute('nobody@example.com', 'pass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
