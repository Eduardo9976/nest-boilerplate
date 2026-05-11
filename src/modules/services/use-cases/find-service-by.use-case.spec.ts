import { FindServiceByUseCase } from './find-service-by.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';

describe('FindServiceByUseCase', () => {
  let useCase: FindServiceByUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    category: 'cabelo',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new FindServiceByUseCase(mockRepo);
  });

  it('returns array of services matching filter', async () => {
    const services = [makeService()];
    mockRepo.findBy.mockResolvedValue(services);

    const result = await useCase.execute({ isActive: true });

    expect(result).toEqual(services);
    expect(mockRepo.findBy).toHaveBeenCalledWith({ isActive: true });
  });

  it('returns empty array when no services match', async () => {
    mockRepo.findBy.mockResolvedValue([]);

    const result = await useCase.execute({ name: 'nonexistent' });

    expect(result).toEqual([]);
  });

  it('delegates empty filter to repository', async () => {
    mockRepo.findBy.mockResolvedValue([makeService()]);

    await useCase.execute({});

    expect(mockRepo.findBy).toHaveBeenCalledWith({});
  });
});
