import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const TokenPairSchema = z.object({
  accessToken: z.string().describe('JWT de acesso — expira em 15 minutos'),
  refreshToken: z.string().describe('JWT de refresh — expira em 7 dias'),
});

export class TokenPairDto extends createZodDto(TokenPairSchema) {}
