import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindCategorySchema = z.object({
  name: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export class FindCategoryDto extends createZodDto(FindCategorySchema) {}
