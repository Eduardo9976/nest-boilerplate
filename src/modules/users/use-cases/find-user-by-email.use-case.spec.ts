import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import type { UserRepository } from '../domain/user.repository';
import type { User } from '../domain/user.entity';

describe('FindUserByEmailUseCase', () => {
  let useCase: FindUserByEmailUseCase;
  let mockRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
    };
    useCase = new FindUserByEmailUseCase(mockRepo);
  });

  it('returns the user when found', async () => {
    const user: User = {
      id: 'uuid-1',
      email: 'test@example.com',
      passwordHash: null,
      googleId: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRepo.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute('test@example.com');

    expect(result).toBe(user);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('returns null when not found', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    const result = await useCase.execute('missing@example.com');
    expect(result).toBeNull();
  });
});
