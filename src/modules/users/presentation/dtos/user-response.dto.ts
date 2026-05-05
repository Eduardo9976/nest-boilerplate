import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UserResponseSchema = z.object({
  id: z.string().uuid().describe('ID único do usuário'),
  email: z.string().email().describe('E-mail do usuário'),
  role: z.enum(['USER', 'ADMIN']).describe('Papel do usuário no sistema'),
  createdAt: z.string().datetime().describe('Data de criação da conta em ISO 8601'),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
