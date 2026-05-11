import { Inject, Injectable } from '@nestjs/common';
import {
  FindOneServiceFilters,
  SERVICE_REPOSITORY,
  ServiceRepository
} from "../domain/service.repository";
import {Service} from "../domain/service.entity";

@Injectable()
export class FindOneServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  execute(filter: FindOneServiceFilters): Promise<Service | null> {
    return this.serviceRepository.findOne(filter);
  }
}
