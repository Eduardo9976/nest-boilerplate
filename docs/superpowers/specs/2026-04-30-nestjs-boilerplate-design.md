# NestJS Enterprise Boilerplate — Design Spec

**Date:** 2026-04-30
**Status:** Approved

---

## 1. Objective

Produce a complete, production-ready NestJS boilerplate that serves as the foundation for multiple teams. It must be clean, teachable, and extensible without being overengineered.

**Stack:**
- NestJS v10+
- Zod v4 (validation)
- Prisma v7 (ORM)
- PostgreSQL 16
- Redis 7 (refresh token store)
- Docker Compose (Postgres + Redis)
- Swagger (non-production only)
- JWT (access + refresh tokens)
- Google OAuth via Passport.js (feature-flagged)
- pnpm

---

## 2. Architectural Pattern

**Clean Architecture with per-module layers (Approach B).**

Each feature module is fully self-contained and has four explicit sub-layers:

| Layer | Folder | Allowed dependencies |
|---|---|---|
| Domain | `domain/` | None (pure TypeScript) |
| Application | `application/` | `domain/` interfaces only |
| Infrastructure | `infrastructure/` | `application/` + `domain/` + external (Prisma, Redis, Passport) |
| Presentation | `presentation/` | `application/` use cases only |

**The domain layer never imports from NestJS or Prisma.** This is the single most important invariant to maintain.

---

## 3. Folder Structure

```
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── env.schema.ts
│   ├── env.config.ts
│   └── config.module.ts
│
├── shared/
│   ├── pipes/
│   │   └── zod-validation.pipe.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   └── guards/
│       └── jwt-auth.guard.ts
│
├── modules/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── user.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts
│   │   │   │   └── password.vo.ts
│   │   │   └── repositories/
│   │   │       └── user.repository.interface.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── create-user.use-case.ts
│   │   │       ├── find-user-by-email.use-case.ts
│   │   │       └── validate-password.use-case.ts
│   │   ├── infrastructure/
│   │   │   └── prisma-service.repository.ts
│   │   ├── presentation/
│   │   │   ├── services.controller.ts
│   │   │   └── dtos/
│   │   │       └── create-service.dto.ts
│   │   └── users.module.ts
│   │
│   └── auth/
│       ├── application/
│       │   ├── jwt-login.use-case.ts
│       │   ├── google-login.use-case.ts
│       │   └── refresh-token.use-case.ts
│       ├── infrastructure/
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── jwt-refresh.strategy.ts
│       │   │   └── google.strategy.ts
│       │   └── redis-token.repository.ts
│       ├── presentation/
│       │   ├── auth.controller.ts
│       │   └── dtos/
│       │       └── login.dto.ts
│       └── auth.module.ts
│
└── infrastructure/
    └── prisma/
        ├── prisma.service.ts
        ├── prisma.module.ts
        └── schema.prisma
```

---

## 4. Data Model

### Prisma Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?
  googleId  String?  @unique
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

`password` is nullable to support OAuth-only accounts. `googleId` is nullable to support email/password-only accounts. `role` is included now to avoid a schema migration when teams add RBAC.

---

## 5. Infrastructure

### Docker Compose

Two services:
- `postgres` — `postgres:16-alpine`, port `5432`
- `redis` — `redis:7-alpine`, port `6379`

### Redis — Refresh Token Storage

Key pattern: `refresh:<userId>:<tokenId>`
TTL: matches `JWT_REFRESH_EXPIRES_IN` (default: 7 days)

On refresh: verify key exists → delete old key → generate new token pair → store new key.
On logout: delete all `refresh:<userId>:*` keys → revokes all sessions.

---

## 6. Environment Configuration

### Variables

```
# App
PORT                        (default: 3000)
NODE_ENV                    (development | production | test)

# Database
DATABASE_URL

# Redis
REDIS_URL

# JWT
JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN       (default: 15m)
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN      (default: 7d)

# Feature Flags
ENABLE_JWT_AUTH             (default: true)
ENABLE_GOOGLE_AUTH          (default: false)

# Google OAuth — required only when ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
```

### Validation Strategy

Zod v4 schema in `config/env.schema.ts`. The app boots only after the schema passes. Google vars are conditionally required using `.superRefine()` — if `ENABLE_GOOGLE_AUTH=true` and `GOOGLE_CLIENT_ID` is missing, the app throws a clear error message and exits.

---

## 7. Auth Module

### JWT Login Flow

```
POST /auth/login
  ZodValidationPipe(LoginSchema)
  → JwtLoginUseCase
      → FindUserByEmailUseCase → IUserRepository
      → ValidatePasswordUseCase → bcrypt.compare
      → JwtService.sign() → accessToken (15m)
      → crypto.randomUUID() → tokenId
      → JwtService.sign({ sub: userId, tokenId }, refreshSecret, TTL) → refreshToken
      → RedisTokenRepository.store(userId, tokenId, TTL)
  ← { accessToken, refreshToken }
  
Note: refreshToken is a signed JWT with payload { sub: userId, tokenId }. The raw tokenId
is what gets stored in Redis. JwtRefreshStrategy validates the JWT signature and expiry
before the use case checks Redis for the tokenId.
```

### Refresh Flow

```
POST /auth/refresh  [Bearer: refreshToken]
  → JwtRefreshStrategy validates signature + expiry
  → RefreshTokenUseCase
      → RedisTokenRepository.verify(userId, tokenId) — throws 401 if missing
      → delete old key
      → generate new accessToken + tokenId
      → store new key
  ← { accessToken, refreshToken }
```

### Google OAuth Flow

```
GET /auth/google
  → GoogleStrategy redirects to Google

GET /auth/google/callback
  → GoogleStrategy.validate(profile)
      → FindUserByEmailUseCase
          → found: return existing user
          → not found: CreateUserUseCase (googleId set, password null)
  → GoogleLoginUseCase → issue JWT pair (same as email login)
  ← { accessToken, refreshToken }
```

### Logout

```
POST /auth/logout  [Bearer: accessToken]
  → extract userId from JWT payload
  → RedisTokenRepository.deleteAll(userId)
  ← 204 No Content
```

---

## 8. Route Protection

**Global default:** `JwtAuthGuard` is applied globally in `main.ts`. Every route is protected unless explicitly opted out.

**`@Public()` decorator:** Marks a route as unauthenticated. Applied to `/auth/login`, `/auth/google`, `/auth/google/callback`, `/auth/refresh`.

**`@Roles(Role.ADMIN)` decorator:** Scaffolded but not globally enforced. Teams add `RolesGuard` when needed.

**Per-controller protection:** Apply `@UseGuards(JwtAuthGuard)` at controller level as an alternative to global guard.

---

## 9. Validation

Single `ZodValidationPipe` in `shared/pipes/`. Accepts any Zod schema and is used as:

```typescript
@Body(new ZodValidationPipe(MySchema)) dto: MyDto
@Query(new ZodValidationPipe(PaginationSchema)) query: PaginationDto
@Param(new ZodValidationPipe(IdSchema)) params: IdDto
```

DTOs are `z.infer<typeof Schema>` — plain TypeScript types, no class decorators. Validation errors are thrown as `BadRequestException` with Zod's formatted field errors.

---

## 10. Error Handling

### Domain Error Hierarchy

```
AppException (base)
  ├── NotFoundException       → HTTP 404
  ├── UnauthorizedException   → HTTP 401
  ├── ConflictException       → HTTP 409
  └── ValidationException     → HTTP 422
```

Domain code throws `AppException` subtypes. The global exception filter maps them to HTTP responses. Domain never imports from `@nestjs/common`.

### Standard Response Shape

```json
{
  "message": "Email already in use",
  "code": "CONFLICT",
  "details": [],
  "timestamp": "2026-04-30T12:00:00.000Z",
  "requestId": "a3f2c1d4-..."
}
```

---

## 11. Logging

`LoggingInterceptor` wraps every request. `requestId` is generated per-request using `crypto.randomUUID()` and stored in `AsyncLocalStorage` — available anywhere in the call stack without prop drilling.

Log shape:
```json
{
  "requestId": "uuid",
  "method": "POST",
  "path": "/auth/login",
  "statusCode": 200,
  "duration": "12ms",
  "context": "AuthController",
  "timestamp": "2026-04-30T12:00:00.000Z"
}
```

---

## 12. Testing Strategy

### Unit Tests (`jest.config.ts`)

Pattern: `src/**/*.spec.ts`
- Test use cases and domain logic in isolation
- Mock `IUserRepository` and `RedisTokenRepository` via constructor injection
- No NestJS test module, no Prisma, no Redis
- Target: `< 5ms` per test

Key files:
- `create-user.use-case.spec.ts`
- `validate-password.use-case.spec.ts`
- `jwt-login.use-case.spec.ts`
- `refresh-token.use-case.spec.ts`

### E2E Tests (`jest-e2e.config.ts`)

Pattern: `test/**/*.e2e-spec.ts`
- Full HTTP pipeline via `supertest`
- Real Postgres + Redis via `.env.test`
- `AppFactory` helper creates app with all globals applied
- `DbCleaner` truncates tables between tests
- Sequential within file, parallel across files

Key files:
- `test/e2e/auth.e2e-spec.ts` — login, refresh, logout; Google OAuth test mocks `GoogleStrategy.validate()` to bypass real Google redirect and tests user creation + JWT issuance directly
- `test/e2e/users.e2e-spec.ts` — create user, protected route access

---

## 13. Swagger

- Mounted at `/api/docs`
- Only enabled when `NODE_ENV !== 'production'`
- Bearer auth scheme documented
- Google OAuth endpoints conditionally registered based on `ENABLE_GOOGLE_AUTH`

---

## 14. Feature Flags

`ENABLE_JWT_AUTH` and `ENABLE_GOOGLE_AUTH` control whether routes are registered at all — not just whether they work. If `ENABLE_GOOGLE_AUTH=false`, no Google strategy is instantiated and no Google routes exist in the router or Swagger.

Implementation: `AuthModule` declares `AuthController` always. A separate `GoogleAuthController` is conditionally added to the module's `controllers` array only when `ENABLE_GOOGLE_AUTH=true`, checked at module initialization via `ConfigService`. No Google strategy is instantiated when the flag is off.

---

## 15. Design Decisions

### Prisma over TypeORM
Prisma's schema-first approach, generated client, and type safety at the query level are significantly better than TypeORM's decorator-heavy model. Prisma migrations are explicit and readable. TypeORM's `synchronize: true` has caused data loss in production.

### Zod over class-validator
`class-validator` requires classes and decorators, which leak into DTOs and create a hidden coupling between the validation layer and the TypeScript type system. Zod schemas are pure values — they can be composed, reused, and tested independently. `z.infer<>` means the type and the validator are always in sync.

### DDD-lite
Full DDD (aggregates, domain events, sagas) is appropriate for complex domains with rich business logic. This boilerplate uses the structural benefits of DDD (explicit layers, repository abstraction, value objects) without the ceremony. Teams can escalate to full DDD per module as complexity grows.

### Per-module layers over global layers
Navigating by feature (`modules/users/`) is faster than navigating by layer (`domain/users/`). When a module grows large enough to extract into a microservice, everything it needs is already in one folder.

### AsyncLocalStorage for requestId
Passing `requestId` through every function signature pollutes interfaces and couples unrelated code. `AsyncLocalStorage` provides request-scoped context injection without any of that coupling — the same pattern used by frameworks like OpenTelemetry.
