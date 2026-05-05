import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ErrorResponseSchema = z.object({
  message: z.string().describe('Mensagem de erro legível'),
  code: z.string().describe('Código do erro (ex: UNAUTHORIZED, CONFLICT)'),
  details: z.array(z.unknown()).describe('Detalhes adicionais de validação'),
  timestamp: z.string().datetime().describe('Momento do erro em ISO 8601'),
  requestId: z.string().describe('ID da requisição para rastreamento de logs'),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
