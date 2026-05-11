import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindOneCategorySchema = z.object({
  identifier: z.string().min(1),
});

export class FindOneCategoryDto extends createZodDto(FindOneCategorySchema) {}
