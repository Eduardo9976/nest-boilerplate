import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateUserSchema = z.object({
  email: z.string().email().describe('E-mail do novo usuário'),
  password: z.string().min(8).describe('Senha com mínimo de 8 caracteres'),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
