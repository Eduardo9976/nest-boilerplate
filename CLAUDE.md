# CLAUDE.md — poc-nest

## Project

NestJS 11 API. Clean Architecture. TypeScript strict. pnpm.

Stack: NestJS · Prisma · Redis · JWT/Passport · Zod · Jest

## Architecture

```
src/
  modules/<name>/
    domain/          # entities, repository interfaces — no framework deps
    use-cases/       # one class per use case, one public method: execute()
    infrastructure/  # Prisma/Redis implementations of domain interfaces
    presentation/    # controllers, DTOs (Zod schemas)
  shared/            # cross-cutting: guards, filters, interceptors, pipes, exceptions
  infrastructure/    # global: PrismaService (ConfigService-injected), RedisModule
  config/            # env schema (Zod + regex validation), config module
```

**Dependency rule:** domain ← use-cases ← infrastructure/presentation. Never inward pointing outward.

## Module Map

### auth
| File | Role |
|------|------|
| `use-cases/token-issuer.service.ts` | Signs JWTs + stores refresh token in Redis. Shared by all auth use cases. |
| `use-cases/jwt-login.use-case.ts` | Validates email/password → delegates token issuance to `TokenIssuerService` |
| `use-cases/google-login.use-case.ts` | Google OAuth flow. Handles TOCTOU race on first login via ConflictException retry. |
| `use-cases/refresh-token.use-case.ts` | Verifies refresh token in Redis, rotates token pair |
| `use-cases/logout.use-case.ts` | Invalidates all refresh tokens for a user |
| `infrastructure/redis-token.repository.ts` | Redis SCAN-based token store (no KEYS) |
| `infrastructure/strategies/` | JWT, JWT-refresh, Google Passport strategies |
| `presentation/auth.controller.ts` | login / refresh / logout endpoints |
| `presentation/google-auth.controller.ts` | Google OAuth redirect + callback |

### users
| File | Role |
|------|------|
| `domain/user.entity.ts` | `User` interface + `Role` type |
| `domain/user.repository.ts` | `UserRepository` interface (no `I` prefix) + `USER_REPOSITORY` token |
| `use-cases/create-user.use-case.ts` | Creates user, bcrypt-hashes password |
| `use-cases/find-user-by-email.use-case.ts` | Delegates to repository |
| `use-cases/validate-password.use-case.ts` | bcrypt compare, rejects social-only accounts |
| `infrastructure/prisma-service.repository.ts` | Implements `UserRepository` via Prisma |

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Classes | PascalCase | `CreateUserUseCase` |
| Files | kebab-case | `create-user.use-case.ts` |
| Interfaces | PascalCase, **no `I` prefix** | `UserRepository` |
| Implementations | infra-prefix + interface name | `PrismaServiceRepository` |
| DTOs | PascalCase + `Dto` suffix | `CreateServiceDto` |
| Enums | PascalCase, members SCREAMING_SNAKE | `UserRole.ADMIN` |
| Constants | SCREAMING_SNAKE | `MAX_REFRESH_TOKENS` |
| Boolean vars | is/has/can prefix | `isExpired`, `hasRole` |

## Code Rules

### General
- No comments unless WHY is non-obvious (hidden constraint, workaround, invariant)
- No TODO/FIXME left in committed code
- Explicit return types on public methods
- No `any` — use `unknown` + narrowing or define a type
- No non-null assertion (`!`) unless inside a guard that already verified existence
- Throw domain exceptions from `shared/exceptions/`, not raw `HttpException`

### SOLID
- Single responsibility: one class, one reason to change
- Open/closed: extend via composition, not modification
- Liskov: implementations must honor interface contracts
- Interface segregation: split interfaces if consumers use only a subset
- Dependency inversion: depend on abstractions (interfaces), inject via NestJS DI

### DRY
- Extract repeated logic to shared utilities or base classes only when 3+ usages
- Reuse existing exceptions in `shared/exceptions/` before creating new ones

### YAGNI
- No abstract classes, helpers, or generic utilities without an immediate use case
- No feature flags or backwards-compatibility shims
- No optional parameters for hypothetical future callers

### Clean Code
- Functions do one thing; if you need "and" to describe it, split
- Max function length: ~20 lines; extract if longer
- Max parameters: 3; use an object/DTO beyond that
- Prefer early returns over nested conditionals
- Name variables for what they represent, not how they're used (`userId` not `id`)

## Use Cases

```ts
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // domain logic here
  }
}
```

- One public method: `execute()`
- Input/output: plain domain types or primitives — no HTTP or Prisma types
- No controller logic; no Prisma calls — delegate to repository interface
- Shared infrastructure logic (e.g. token issuance) → extract to a `*.service.ts` in `use-cases/`

## DTOs & Validation

- Define Zod schema + infer type; pass through `ZodValidationPipe`
- No `class-validator` — project uses Zod exclusively
- DTOs live in `presentation/dtos/`
- Validation failures throw `ValidationException` → mapped to HTTP 422 by `GlobalExceptionFilter`

## Error Handling

| Exception | HTTP |
|-----------|------|
| `ValidationException` | 422 |
| `ConflictException` | 409 |
| `NotFoundException` | 404 |
| `UnauthorizedException` | 401 |
| `AppException` (base) | 500 |

- All HTTP errors go through `GlobalExceptionFilter`
- Do not catch and re-throw without adding context
- Do not throw `HttpException` directly — use typed subclasses from `shared/exceptions/`

## Config & Env

- `ConfigService.getOrThrow<string>('KEY')` — never `get()` with `|| ''` fallback
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` validated with regex `/^\d+[smhd]$/` at startup
- `DATABASE_URL` injected into `PrismaService` via `ConfigService`, not `process.env`

## Redis

- `deleteAll` uses SCAN with pagination — never `KEYS` (blocking on large keyspaces)
- Token key format: `refresh:{userId}:{tokenId}` with TTL equal to refresh token lifetime

## Testing

- Unit tests: mock all deps via `jest.fn()`
- One `describe` per class, one `it` per behavior
- Test file co-located: `<name>.spec.ts`
- E2E in `test/`
- No real DB in unit tests
- Password-hashing tests must assert bcrypt format: `expect.stringMatching(/^\$2[aby]\$/)`

## Git

- User does all git operations — never commit or push
- Branch naming: `feat/`, `fix/`, `refactor/`, `chore/`

## Commands

```bash
pnpm start:dev       # dev server
pnpm test            # unit tests
pnpm test:e2e        # e2e tests
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm prisma:migrate  # DB migrations
pnpm prisma:generate # generate Prisma client
```
