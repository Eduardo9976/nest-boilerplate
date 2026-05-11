import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateCategorySchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().min(8).max(255).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
