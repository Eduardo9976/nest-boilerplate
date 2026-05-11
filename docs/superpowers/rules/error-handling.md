# Error Handling — poc-nest

## Hierarquia de exceções de domínio

Todas em `src/shared/exceptions/`.

```
AppException (abstract, extends Error)
├── NotFoundException       → code: 'NOT_FOUND'       → HTTP 404
├── UnauthorizedException   → code: 'UNAUTHORIZED'     → HTTP 401
├── ConflictException       → code: 'CONFLICT'         → HTTP 409
└── ValidationException     → code: 'VALIDATION_ERROR' → HTTP 422
                              + details: { field, message }[]
```

**Invariante crítica:** `AppException` e seus subtipos **nunca importam de `@nestjs/common`**.  
Domain e application layers jogam apenas `AppException` subtypes.

---

## Criando nova exceção de domínio

```typescript
// src/shared/exceptions/forbidden.exception.ts
import { AppException } from './app.exception';

export class ForbiddenException extends AppException {
  readonly code = 'FORBIDDEN';
}
```

E adicionar o mapeamento no `GlobalExceptionFilter`:

```typescript
private appExceptionToStatus(e: AppException): number {
  if (e instanceof NotFoundException) return HttpStatus.NOT_FOUND;
  if (e instanceof UnauthorizedException) return HttpStatus.UNAUTHORIZED;
  if (e instanceof ConflictException) return HttpStatus.CONFLICT;
  if (e instanceof ValidationException) return HttpStatus.UNPROCESSABLE_ENTITY;
  if (e instanceof ForbiddenException) return HttpStatus.FORBIDDEN;  // ← adicionar
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
```

---

## GlobalExceptionFilter

`src/shared/filters/global-exception.filter.ts` — registrado globalmente em `main.ts`.

Trata três casos:
1. **`HttpException`** (NestJS built-in) — usa o status e body do próprio exception
2. **`AppException`** (domínio) — mapeia code para HTTP status
3. **Qualquer outro** — 500 genérico

Formato padrão de resposta:
```json
{
  "message": "string",
  "code": "CONFLICT",
  "details": [],
  "timestamp": "ISO string",
  "requestId": "uuid"
}
```

`requestId` vem do `AsyncLocalStorage` via `RequestContext.get()?.requestId ?? 'unknown'`.

---

## Validação de entrada (ZodValidationPipe)

`src/shared/pipes/zod-validation.pipe.ts` — pipe genérico, aceita qualquer Zod schema.

```typescript
// Uso nos controllers
@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateServiceDto
@Query(new ZodValidationPipe(PaginationSchema)) query: PaginationDto
@Param(new ZodValidationPipe(IdSchema)) params: IdDto
```

Erros de validação são lançados como `BadRequestException` (HTTP 400) com:
```json
{
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "String must contain at least 8 character(s)" }
  ]
}
```

---

## Onde usar cada exceção

| Situação | Exceção |
|---|---|
| Recurso não encontrado no DB | `NotFoundException` |
| Credenciais inválidas, token expirado | `UnauthorizedException` |
| Email já cadastrado, recurso duplicado | `ConflictException` |
| Dados inválidos no nível de negócio | `ValidationException` |
| Rota protegida sem permissão | `ForbiddenException` (adicionar se necessário) |
| Entrada inválida (schema) | `ZodValidationPipe` lança `BadRequestException` automaticamente |

---

## Logging de erros

`LoggingInterceptor` loga a request completa (requestId, método, path, statusCode, duration).  
Erros não logados individualmente — o status code no log de saída indica o problema.  
Para erros críticos de sistema, adicionar logger no bloco 500 do `GlobalExceptionFilter`.
