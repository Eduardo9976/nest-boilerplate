import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginSchema = z.object({
  email: z.string().email().describe('E-mail do usuário'),
  password: z.string().min(1).describe('Senha do usuário'),
});

export class LoginDto extends createZodDto(LoginSchema) {}
