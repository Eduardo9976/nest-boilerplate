import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REPOSITORY, ServiceData, ServiceRepository } from '../domain/service.repository';
import { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class CreateServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  async execute(input: ServiceData): Promise<Service> {
    const name = input.name.trim().toLowerCase();
    const description = input.description?.trim().toLowerCase();
    const imageUrl = input.imageUrl?.trim().toLowerCase();

    const existing = await this.serviceRepository.findOne({ name });
    if (existing) throw new ConflictException('Service already exists');

    return this.serviceRepository.create({ ...input, name, description, imageUrl });
  }
}
