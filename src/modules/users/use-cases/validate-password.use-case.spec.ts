import * as bcrypt from 'bcrypt';
import { ValidatePasswordUseCase } from './validate-password.use-case';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';
import type { User } from '../domain/user.entity';

describe('ValidatePasswordUseCase', () => {
  let useCase: ValidatePasswordUseCase;

  const makeUser = async (plain: string | null): Promise<User> => {
    const passwordHash = plain ? await bcrypt.hash(plain, 10) : null;
    return {
      id: 'uuid-1',
      email: 'test@example.com',
      passwordHash,
      googleId: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  beforeEach(() => {
    useCase = new ValidatePasswordUseCase();
  });

  it('resolves when password matches', async () => {
    const user = await makeUser('correct-password');
    await expect(useCase.execute(user, 'correct-password')).resolves.toBeUndefined();
  });

  it('throws UnauthorizedException when password does not match', async () => {
    const user = await makeUser('correct-password');
    await expect(useCase.execute(user, 'wrong-password')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user has no password (OAuth account)', async () => {
    const user = await makeUser(null);
    await expect(useCase.execute(user, 'any-password')).rejects.toThrow(UnauthorizedException);
  });
});
