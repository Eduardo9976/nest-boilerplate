import { CreateServiceUseCase } from './create-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    description: 'corte de cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    category: 'cabelo',
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
    category: 'cabelo',
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new CreateServiceUseCase(mockRepo);
  });

  it('creates service and normalizes name/description to lowercase', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeService());

    const result = await useCase.execute(input);

    expect(result.name).toBe('corte');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'corte', description: 'corte de cabelo' }),
    );
  });

  it('throws ConflictException when service name already exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeService());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
