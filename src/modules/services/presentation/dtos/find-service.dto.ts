import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export class FindServiceDto extends createZodDto(FindServiceSchema) {}
