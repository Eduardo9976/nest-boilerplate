import { CreateUserUseCase } from './create-user.use-case';
import type { IUserRepository } from '../domain/user.repository';
import type { User } from '../domain/user.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepo: jest.Mocked<IUserRepository>;

  const makeUser = (email: string): User => ({
    id: 'uuid-1',
    email,
    passwordHash: null,
    googleId: null,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
    };
    useCase = new CreateUserUseCase(mockRepo);
  });

  it('creates user when email is not taken', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeUser('new@example.com'));

    const result = await useCase.execute({ email: 'new@example.com', password: 'secret123' });

    expect(result.email).toBe('new@example.com');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com' }),
    );
  });

  it('throws ConflictException when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue(makeUser('dup@example.com'));

    await expect(
      useCase.execute({ email: 'dup@example.com', password: 'secret' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates OAuth user with null password hash', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeUser('oauth@example.com'));

    await useCase.execute({ email: 'oauth@example.com', googleId: 'g-123' });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: null, googleId: 'g-123' }),
    );
  });
});
