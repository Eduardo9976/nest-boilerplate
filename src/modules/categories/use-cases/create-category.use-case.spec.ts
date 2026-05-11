import { CreateCategoryUseCase } from './create-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    description: 'serviços de cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const input = {
    name: 'Cabelo',
    description: 'Serviços de Cabelo',
    isActive: true,
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateCategoryUseCase(mockRepo);
  });

  it('creates category and normalizes name to lowercase', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeCategory());

    const result = await useCase.execute(input);

    expect(result.name).toBe('cabelo');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cabelo', description: 'Serviços de Cabelo' }),
    );
  });

  it('throws ConflictException when category name already exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeCategory());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
