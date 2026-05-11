# Architecture — poc-nest

## Padrão: Clean Architecture por módulo

Cada módulo de feature é **completamente self-contained** com quatro sub-layers explícitas:

```
src/modules/<feature>/
├── domain/           ← puro TypeScript, zero deps externas
│   ├── user.entity.ts       ← plain interface
│   └── user.repository.ts   ← interface (contrato) + Symbol token
├── use-cases/        ← orquestra domain, sem framework
│   ├── *.use-case.ts
│   └── *.use-case.spec.ts
├── infrastructure/   ← implementa interfaces do domain (Prisma, Redis, Passport)
│   ├── strategies/
│   └── *.repository.ts
└── presentation/     ← controllers + DTOs (NestJS + Zod)
    ├── *.controller.ts
    └── dtos/
```

**Sem value objects.** Validação de formato e regras simples ficam nos Zod schemas dos DTOs. Value objects só justificam custo se houver lógica de negócio complexa encapsulada — raro em projetos menores.

## Regras de dependência entre layers (ABSOLUTO)

```
domain         ← nenhum import (puro TS, nunca importa NestJS, Prisma, Redis)
use-cases      ← domain apenas (interfaces, entidades)
infrastructure ← domain + externos (Prisma, Redis, ioredis, Passport)
presentation   ← use-cases apenas
```

**A domain layer NUNCA importa de `@nestjs/common` nem de `@prisma/client`.**  
É o invariante mais importante do projeto.

## Módulos globais

- `PrismaModule` — global, exporta `PrismaService`
- `RedisModule` — global, exporta `REDIS_CLIENT` (token de injeção)
- `AppConfigModule` — global, wraps `ConfigModule.forRoot` com validação Zod

## Injeção de dependência — Repository Pattern

Repositórios são injetados via token Symbol, não via classe concreta:

```typescript
// interface no domain
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface IUserRepository { ... }

// binding no module
{ provide: USER_REPOSITORY, useClass: PrismaServiceRepository }

// uso no use case
constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserRepository) {}
```

**Princípio:** application layer conhece apenas a interface, nunca a implementação.

## Módulo Auth — feature flags

Google OAuth é feature-flagged. Controllers e providers são condicionalmente registrados:

```typescript
const ENABLE_GOOGLE = process.env.ENABLE_GOOGLE_AUTH === 'true';

@Module({
  controllers: ENABLE_GOOGLE ? [AuthController, GoogleAuthController] : [AuthController],
  providers: [
    ...
    ...(ENABLE_GOOGLE ? [GoogleStrategy, GoogleLoginUseCase] : []),
  ],
})
```

Se `ENABLE_GOOGLE_AUTH=false`: nenhuma rota Google existe no router nem no Swagger.

## Proteção de rotas

- **Global default:** `JwtAuthGuard` aplicado globalmente — todas as rotas protegidas
- **Opt-out:** `@Public()` marca rota como pública
- **`@Roles()`:** decorator scaffolded mas não enforced globalmente — times adicionam `RolesGuard` quando precisam

## Fluxo de tokens JWT

```
Access token:  { sub: userId }       — assina com JWT_ACCESS_SECRET  — expira em 15m
Refresh token: { sub: userId, tokenId } — assina com JWT_REFRESH_SECRET — expira em 7d

Redis key: refresh:<userId>:<tokenId>  TTL = JWT_REFRESH_EXPIRES_IN
```

**Refresh flow:** JwtRefreshStrategy valida assinatura JWT → RefreshTokenUseCase verifica Redis → deleta chave antiga → emite novo par.

**Logout:** deleta todas as chaves `refresh:<userId>:*` → revoga todas as sessões.

## Request context (AsyncLocalStorage)

`requestId` gerado por request com `crypto.randomUUID()`. Armazenado em `AsyncLocalStorage` via `LoggingInterceptor`. Disponível em qualquer ponto da call stack sem prop drilling:

```typescript
const requestId = RequestContext.get()?.requestId;
```

## Tratamento de erros

Domain lança `AppException` subtypes. `GlobalExceptionFilter` mapeia para HTTP:

```
AppException subtypes        → HTTP
NotFoundException            → 404
UnauthorizedException        → 401
ConflictException            → 409
ValidationException          → 422
(qualquer HttpException)     → status original
(qualquer outro erro)        → 500
```

Formato padrão de resposta:
```json
{
  "message": "Email already in use",
  "code": "CONFLICT",
  "details": [],
  "timestamp": "2026-05-01T12:00:00.000Z",
  "requestId": "uuid-aqui"
}
```

## Decisões de design

| Decisão | Motivo |
|---|---|
| **Prisma sobre TypeORM** | Schema-first, migrations explícitas, type safety no query level. TypeORM's `synchronize: true` causou perda de dados em prod. |
| **Zod sobre class-validator** | class-validator exige classes e decorators nos DTOs, coupling com o type system. Zod schema é valor puro, `z.infer<>` garante tipo e validator sempre em sincronia. |
| **Clean Architecture (sem DDD-lite)** | Sem aggregates, domain events, sagas, value objects. Entidades são plain interfaces. Layers explícitas + repository abstraction sem ceremony de DDD. Escala bem para projetos de tamanho médio sem overhead. |
| **Organização por feature, não por layer** | `modules/users/` > `domain/users/`. Quando um módulo cresce e vira microserviço, tudo que precisa já está numa pasta. |
| **AsyncLocalStorage para requestId** | Passar requestId por toda assinatura polui interfaces. ALS = request-scoped context sem acoplamento. |
