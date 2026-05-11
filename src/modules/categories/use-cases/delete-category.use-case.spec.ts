import { DeleteCategoryUseCase } from './delete-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
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
    useCase = new DeleteCategoryUseCase(mockRepo);
  });

  it('deletes category when it exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeCategory());
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('uuid-1')).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('uuid-1');
  });

  it('throws NotFoundException when category does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute('uuid-1')).rejects.toThrow(NotFoundException);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
