import type { Service } from './service.entity';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export type ServiceId = Service['id'];

export type FindOneServiceFilters = { id: ServiceId } | { name: Service['name'] };

export type FindByServiceFilters = Partial<Pick<Service, 'id' | 'name' | 'isActive'>>;

export type ServiceData = Pick<
  Service,
  'name' | 'description' | 'durationInMinutes' | 'price' | 'isActive' | 'imageUrl' | 'categoryId'
>;

export type UpdateServiceRepositoryInput = Partial<ServiceData> & { id: ServiceId };

export interface ServiceRepository {
  findOne(filter: FindOneServiceFilters): Promise<Service | null>;
  findBy(filter: FindByServiceFilters): Promise<Service[]>;
  create(data: ServiceData): Promise<Service>;
}
