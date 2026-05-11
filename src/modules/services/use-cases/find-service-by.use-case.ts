import { Inject, Injectable } from '@nestjs/common';
import {FindByServiceFilters, SERVICE_REPOSITORY, ServiceRepository} from "../domain/service.repository";
import {Service} from "../domain/service.entity";

@Injectable()
export class FindServiceByUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  execute(filter: FindByServiceFilters): Promise<Service[]> {
    return this.serviceRepository.findBy(filter);
  }
}
