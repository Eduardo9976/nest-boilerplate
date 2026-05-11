import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CategoryResponseSchema = z.object({
  id: z.string().uuid().describe('ID da categoria'),
  name: z.string().describe('Nome da categoria'),
  description: z.string().optional().describe('Descrição da categoria'),
  isActive: z.boolean(),
  createdAt: z.string().datetime().describe('Data de criação em ISO 8601'),
  updatedAt: z.string().datetime().describe('Data de atualização em ISO 8601'),
});

export class CategoryResponseDto extends createZodDto(CategoryResponseSchema) {}
