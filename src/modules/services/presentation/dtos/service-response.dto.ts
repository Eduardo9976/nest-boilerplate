import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ServiceResponseSchema = z.object({
  id: z.string().uuid().describe('ID do serviço'),
  name: z.string().describe('Nome do serviço'),
  description: z.string().optional().describe('Descrição do serviço'),
  durationInMinutes: z.number().positive().describe('Tempo de duração do serviço'),
  price: z.coerce.number().positive().describe('Preço do serviço'),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional().describe('Url da imagem'),
  categoryId: z.string().uuid().describe('ID da categoria'),
  createdAt: z.string().datetime().describe('Data de criação em ISO 8601'),
  updatedAt: z.string().datetime().describe('Data de atualização em ISO 8601'),
});

export class ServiceResponseDto extends createZodDto(ServiceResponseSchema) {}
