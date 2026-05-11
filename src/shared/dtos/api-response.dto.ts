import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ApiResponseSchema = z.object({
  data: z.unknown(),
});

export class ApiResponseDto extends createZodDto(ApiResponseSchema) {}
