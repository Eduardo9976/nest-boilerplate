# Swagger / OpenAPI — Design Spec

**Data:** 2026-05-04
**Status:** Aprovado

## Objetivo

Implementar documentação Swagger completa na API NestJS, cobrindo todos os endpoints com descrições, schemas de request/response e exemplos de valores, servindo como guia completo para consumidores da API.

## Decisões de design

| Decisão | Escolha | Motivo |
|---|---|---|
| Geração de schemas | `nestjs-zod` | Elimina duplicação entre Zod e `@ApiProperty` |
| Nível de detalhe | Completo + exemplos | Sucesso + todos os erros reais + valores de exemplo |
| Google OAuth | Documentar como redirect | Endpoint visível com `302` e `Location` header |

## Arquitetura

### Pacote

```
npm install nestjs-zod
```

`nestjs-zod` expõe:
- `createZodDto(schema)` — converte um Zod schema em classe reconhecida pelo Swagger
- `patchNestJsSwagger()` — registra o gerador de schemas no `@nestjs/swagger`

### Fluxo de geração

```
Zod schema (.describe())
    └─ createZodDto()
        └─ Classe DTO
            └─ patchNestJsSwagger() ensina @nestjs/swagger a ler a classe
                └─ SwaggerModule.createDocument() gera o JSON OpenAPI
```

---

## Mudanças por arquivo

### `src/main.ts`

- Importar e chamar `patchNestJsSwagger()` antes de `SwaggerModule.createDocument()`
- Nomear o bearer auth: `.addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')`
- Adicionar tags com descrição: `.addTag('auth', 'Autenticação JWT e Google OAuth')` e `.addTag('users', 'Gerenciamento de usuários')`

### `src/modules/auth/presentation/dtos/login.dto.ts`

Antes: exportava `type LoginDto = z.infer<...>`
Depois: exporta classe via `createZodDto`, campos com `.describe()`

```ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginSchema = z.object({
  email: z.string().email().describe('E-mail do usuário'),
  password: z.string().min(1).describe('Senha do usuário'),
});

export class LoginDto extends createZodDto(LoginSchema) {}
```

### `src/modules/users/presentation/dtos/create-user.dto.ts`

Mesma mudança: type → classe.

```ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateUserSchema = z.object({
  email: z.string().email().describe('E-mail do novo usuário'),
  password: z.string().min(8).describe('Senha com mínimo de 8 caracteres'),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
```

### `src/modules/auth/presentation/dtos/token-pair.dto.ts` *(novo)*

```ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const TokenPairSchema = z.object({
  accessToken: z.string().describe('JWT de acesso — expira em 15 minutos'),
  refreshToken: z.string().describe('JWT de refresh — expira em 7 dias'),
});

export class TokenPairDto extends createZodDto(TokenPairSchema) {}
```

### `src/modules/users/presentation/dtos/user-response.dto.ts` *(novo)*

```ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UserResponseSchema = z.object({
  id: z.string().uuid().describe('ID único do usuário'),
  email: z.string().email().describe('E-mail do usuário'),
  role: z.enum(['USER', 'ADMIN']).describe('Papel do usuário no sistema'),
  createdAt: z.string().datetime().describe('Data de criação da conta'),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
```

### `src/shared/dtos/error-response.dto.ts` *(novo)*

Shape real do `GlobalExceptionFilter`:

```ts
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
```

---

## Decorators por endpoint

### `POST /auth/login`

```ts
@ApiOperation({ summary: 'Login com e-mail e senha' })
@ApiBody({
  type: LoginDto,
  examples: {
    valido: { value: { email: 'usuario@example.com', password: 'senha123' } },
  },
})
@ApiResponse({ status: 200, description: 'Tokens gerados', type: TokenPairDto })
@ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
@ApiResponse({ status: 401, description: 'Credenciais incorretas', type: ErrorResponseDto })
```

### `POST /auth/refresh`

```ts
@ApiBearerAuth('access-token')
@ApiOperation({
  summary: 'Renovar par de tokens',
  description: 'Envia o **refresh token** no header `Authorization: Bearer <refresh_token>`',
})
@ApiResponse({ status: 200, description: 'Novo par de tokens', type: TokenPairDto })
@ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado', type: ErrorResponseDto })
```

### `POST /auth/logout`

O `@ApiBearerAuth()` existente precisa receber o nome `'access-token'` para corresponder ao esquema registrado no `main.ts`.

```ts
@ApiBearerAuth('access-token')  // ← atualizar o decorator existente
@ApiOperation({ summary: 'Logout — invalida todos os tokens do usuário' })
@ApiResponse({ status: 204, description: 'Logout realizado com sucesso' })
@ApiResponse({ status: 401, description: 'Não autenticado', type: ErrorResponseDto })
```

### `GET /auth/google`

```ts
@ApiOperation({
  summary: 'Iniciar autenticação via Google OAuth 2.0',
  description: 'Redireciona o browser para a tela de login do Google. Não pode ser testado diretamente pelo Swagger UI.',
})
@ApiResponse({
  status: 302,
  description: 'Redirect para o Google',
  headers: {
    Location: {
      description: 'URL da página de autenticação do Google',
      schema: { type: 'string', example: 'https://accounts.google.com/o/oauth2/...' },
    },
  },
})
```

### `GET /auth/google/callback`

```ts
@ApiOperation({
  summary: 'Callback OAuth do Google',
  description: 'Endpoint chamado automaticamente pelo Google após autenticação. Retorna os tokens JWT.',
})
@ApiResponse({ status: 200, description: 'Autenticação bem-sucedida', type: TokenPairDto })
@ApiResponse({ status: 401, description: 'Falha na autenticação OAuth', type: ErrorResponseDto })
```

### `POST /users`

```ts
@ApiOperation({ summary: 'Criar novo usuário' })
@ApiBody({
  type: CreateUserDto,
  examples: {
    valido: { value: { email: 'novo@example.com', password: 'senha1234' } },
  },
})
@ApiResponse({ status: 201, description: 'Usuário criado', type: UserResponseDto })
@ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
@ApiResponse({ status: 409, description: 'E-mail já cadastrado', type: ErrorResponseDto })
```

---

## O que não muda

- `ZodValidationPipe` customizado — continua funcionando como está
- `TokenPair` interface no use-case — é domínio, não documentação
- `GlobalExceptionFilter` — não precisa de alterações
- Lógica de negócio — nenhuma alteração

## Arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| `src/main.ts` | Modificado |
| `src/modules/auth/presentation/dtos/login.dto.ts` | Modificado |
| `src/modules/users/presentation/dtos/create-user.dto.ts` | Modificado |
| `src/modules/auth/presentation/dtos/token-pair.dto.ts` | Criado |
| `src/modules/users/presentation/dtos/user-response.dto.ts` | Criado |
| `src/shared/dtos/error-response.dto.ts` | Criado |
| `src/modules/auth/presentation/auth.controller.ts` | Modificado |
| `src/modules/auth/presentation/google-auth.controller.ts` | Modificado |
| `src/modules/users/presentation/users.controller.ts` | Modificado |
