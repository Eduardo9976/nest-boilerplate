import type { Service } from '../domain/service.entity';
import type { ServiceResponseDto } from './dtos/service-response.dto';

export class ServicesMapper {
  static toResponse(service: Service): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationInMinutes: service.durationInMinutes,
      price: service.price,
      isActive: service.isActive,
      imageUrl: service.imageUrl,
      category: service.category,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    } as ServiceResponseDto;
  }

  static toResponseList(services: Service[]): ServiceResponseDto[] {
    return services.map((s) => ServicesMapper.toResponse(s));
  }
}
