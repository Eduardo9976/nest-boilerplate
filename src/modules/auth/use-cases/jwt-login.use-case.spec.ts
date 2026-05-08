import { JwtLoginUseCase } from './jwt-login.use-case';
import type { TokenIssuerService } from './token-issuer.service';
import type { FindUserByEmailUseCase } from '../../users/use-cases/find-user-by-email.use-case';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';
import type { User } from '../../users/domain/user.entity';

describe('JwtLoginUseCase', () => {
  let useCase: JwtLoginUseCase;
  const mockFindByEmail = { execute: jest.fn() };
  const mockValidatePassword = { execute: jest.fn() };
  const mockTokenIssuer = { issueTokenPair: jest.fn() };

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
      mockTokenIssuer as unknown as TokenIssuerService,
    );
  });

  it('returns token pair on valid credentials', async () => {
    mockFindByEmail.execute.mockResolvedValue(user);
    mockValidatePassword.execute.mockResolvedValue(undefined);
    mockTokenIssuer.issueTokenPair.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await useCase.execute('test@example.com', 'password');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(mockTokenIssuer.issueTokenPair).toHaveBeenCalledWith('user-uuid');
  });

  it('throws UnauthorizedException when user not found', async () => {
    mockFindByEmail.execute.mockResolvedValue(null);

    await expect(useCase.execute('nobody@example.com', 'pass')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenIssuer.issueTokenPair).not.toHaveBeenCalled();
  });
});
