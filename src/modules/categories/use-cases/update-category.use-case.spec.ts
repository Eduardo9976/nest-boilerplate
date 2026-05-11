import { UpdateCategoryUseCase } from './update-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new UpdateCategoryUseCase(mockRepo);
  });

  it('updates category and normalizes name to lowercase', async () => {
    const existing = makeCategory();
    const updated = makeCategory({ name: 'barba' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    mockRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({ id: 'uuid-1', name: 'Barba' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uuid-1', name: 'barba' }),
    );
    expect(result.name).toBe('barba');
  });

  it('throws NotFoundException when category does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'uuid-1', name: 'barba' })).rejects.toThrow(NotFoundException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when new name already taken by another category', async () => {
    const existing = makeCategory({ id: 'uuid-1' });
    const conflict = makeCategory({ id: 'uuid-2', name: 'barba' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(conflict);

    await expect(useCase.execute({ id: 'uuid-1', name: 'barba' })).rejects.toThrow(ConflictException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('allows updating name to same value as current (no self-conflict)', async () => {
    const existing = makeCategory({ id: 'uuid-1', name: 'cabelo' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    mockRepo.update.mockResolvedValue(existing);

    await expect(useCase.execute({ id: 'uuid-1', name: 'cabelo' })).resolves.toBeDefined();
    expect(mockRepo.update).toHaveBeenCalled();
  });
});
