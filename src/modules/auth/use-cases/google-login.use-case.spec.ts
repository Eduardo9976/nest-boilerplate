import { GoogleLoginUseCase } from './google-login.use-case';
import type { JwtLoginUseCase } from './jwt-login.use-case';
import type { FindUserByEmailUseCase } from '../../users/use-cases/find-user-by-email.use-case';
import type { CreateUserUseCase } from '../../users/use-cases/create-user.use-case';
import type { User } from '../../users/domain/user.entity';

describe('GoogleLoginUseCase', () => {
  let useCase: GoogleLoginUseCase;
  const mockFindByEmail = { execute: jest.fn() };
  const mockCreateUser = { execute: jest.fn() };
  const mockJwtLogin = { issueTokenPair: jest.fn() };

  const existingUser: User = {
    id: 'existing-id',
    email: 'existing@example.com',
    passwordHash: null,
    googleId: 'g-123',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const newUser: User = {
    id: 'new-id',
    email: 'new@example.com',
    passwordHash: null,
    googleId: 'g-456',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GoogleLoginUseCase(
      mockFindByEmail as unknown as FindUserByEmailUseCase,
      mockCreateUser as unknown as CreateUserUseCase,
      mockJwtLogin as unknown as JwtLoginUseCase,
    );
    mockJwtLogin.issueTokenPair.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('issues tokens for an existing user', async () => {
    mockFindByEmail.execute.mockResolvedValue(existingUser);

    const result = await useCase.execute({ googleId: 'g-123', email: 'existing@example.com' });

    expect(mockCreateUser.execute).not.toHaveBeenCalled();
    expect(mockJwtLogin.issueTokenPair).toHaveBeenCalledWith('existing-id');
    expect(result.accessToken).toBe('at');
  });

  it('creates a new user when not found, then issues tokens', async () => {
    mockFindByEmail.execute.mockResolvedValue(null);
    mockCreateUser.execute.mockResolvedValue(newUser);

    await useCase.execute({ googleId: 'g-456', email: 'new@example.com' });

    expect(mockCreateUser.execute).toHaveBeenCalledWith({
      email: 'new@example.com',
      googleId: 'g-456',
    });
    expect(mockJwtLogin.issueTokenPair).toHaveBeenCalledWith('new-id');
  });
});
