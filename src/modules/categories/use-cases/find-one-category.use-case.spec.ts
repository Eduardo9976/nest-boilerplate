import { FindOneCategoryUseCase } from './find-one-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

describe('FindOneCategoryUseCase', () => {
  let useCase: FindOneCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new FindOneCategoryUseCase(mockRepo);
  });

  it('returns category when found by id', async () => {
    const category = makeCategory();
    mockRepo.findOne.mockResolvedValue(category);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBe(category);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ id: 'uuid-1' });
  });

  it('returns category when found by name', async () => {
    const category = makeCategory();
    mockRepo.findOne.mockResolvedValue(category);

    const result = await useCase.execute({ name: 'cabelo' });

    expect(result).toBe(category);
  });

  it('throws NotFoundException when category not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'uuid-1' })).rejects.toThrow(NotFoundException);
  });
});
