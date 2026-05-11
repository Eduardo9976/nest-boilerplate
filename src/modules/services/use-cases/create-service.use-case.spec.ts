import { CreateServiceUseCase } from './create-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { FindOneCategoryUseCase } from '../../categories/use-cases/find-one-category.use-case';
import type { Category } from '../../categories/domain/category.entity';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;
  let mockFindOneCategory: jest.Mocked<Pick<FindOneCategoryUseCase, 'execute'>>;

  const makeCategory = (): Category => ({
    id: 'cat-uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    description: 'corte de cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    categoryId: 'cat-uuid-1',
    imageUrl: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const input = {
    name: 'Corte',
    description: 'Corte de Cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    categoryId: 'cat-uuid-1',
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    mockFindOneCategory = { execute: jest.fn() };
    useCase = new CreateServiceUseCase(
      mockRepo,
      mockFindOneCategory as unknown as FindOneCategoryUseCase,
    );
  });

  it('creates service and normalizes name/description to lowercase', async () => {
    mockFindOneCategory.execute.mockResolvedValue(makeCategory());
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeService());

    const result = await useCase.execute(input);

    expect(result.name).toBe('corte');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'corte', description: 'corte de cabelo' }),
    );
  });

  it('throws ConflictException when service name already exists', async () => {
    mockFindOneCategory.execute.mockResolvedValue(makeCategory());
    mockRepo.findOne.mockResolvedValue(makeService());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when categoryId does not exist', async () => {
    mockFindOneCategory.execute.mockRejectedValue(new NotFoundException('Category not found'));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
