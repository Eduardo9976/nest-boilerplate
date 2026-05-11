import { FindOneServiceUseCase } from './find-one-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';

describe('FindOneServiceUseCase', () => {
  let useCase: FindOneServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    categoryId: 'cat-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new FindOneServiceUseCase(mockRepo);
  });

  it('returns service when found by id', async () => {
    const service = makeService();
    mockRepo.findOne.mockResolvedValue(service);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBe(service);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ id: 'uuid-1' });
  });

  it('returns service when found by name', async () => {
    const service = makeService();
    mockRepo.findOne.mockResolvedValue(service);

    const result = await useCase.execute({ name: 'corte' });

    expect(result).toBe(service);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ name: 'corte' });
  });

  it('returns null when service not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBeNull();
  });
});
