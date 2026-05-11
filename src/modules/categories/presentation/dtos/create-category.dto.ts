import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100).describe('Nome da categoria'),
  description: z.string().min(8).max(255).optional().describe('Descrição da categoria'),
  isActive: z.boolean().default(true),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
