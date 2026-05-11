import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(100).describe('Nome do serviço'),
  description: z.string().min(8).max(100).optional().describe('Descrição do serviço'),
  durationInMinutes: z.number().positive().describe('Tempo de duração do serviço'),
  price: z.coerce.number().positive().describe('Preço do serviço'),
  isActive: z.boolean().default(true),
  imageUrl: z.string().min(8).max(100).optional().describe('Url da imagem'),
  categoryId: z.string().uuid().describe('ID da categoria'),
});

export class CreateServiceDto extends createZodDto(CreateServiceSchema) {}
