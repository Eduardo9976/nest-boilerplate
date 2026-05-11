import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindOneServiceSchema = z.object({
  identifier: z.string().min(1),
});

export class FindOneServiceDto extends createZodDto(FindOneServiceSchema) {}
