import { FindCategoryByUseCase } from './find-category-by.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';

describe('FindCategoryByUseCase', () => {
  let useCase: FindCategoryByUseCase;
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
    useCase = new FindCategoryByUseCase(mockRepo);
  });

  it('returns filtered categories', async () => {
    const categories = [makeCategory()];
    mockRepo.findBy.mockResolvedValue(categories);

    const result = await useCase.execute({ isActive: true });

    expect(result).toBe(categories);
    expect(mockRepo.findBy).toHaveBeenCalledWith({ isActive: true });
  });

  it('returns empty array when no categories match', async () => {
    mockRepo.findBy.mockResolvedValue([]);

    const result = await useCase.execute({ name: 'nonexistent' });

    expect(result).toEqual([]);
  });
});
