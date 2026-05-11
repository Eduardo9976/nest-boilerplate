# Request Flow

Every HTTP request passes through this pipeline in order:

1. **Express HTTP layer** — Node.js receives the raw request.
2. **NestJS router** — matches path + method to a controller handler.
3. **Global `LoggingInterceptor`** — generates `requestId`, starts timer, stores in `AsyncLocalStorage`.
4. **Global `JwtAuthGuard`** — checks `@Public()` metadata; if not public, validates Bearer JWT via `JwtStrategy`. Returns 401 if invalid.
5. **Route guard (if any)** — e.g., `AuthGuard('jwt-refresh')` on `POST /auth/refresh`.
6. **`ZodValidationPipe`** (per parameter) — validates and parses `@Body`, `@Query`, or `@Param`. Throws 400 with field-level details on failure.
7. **Controller method** — delegates immediately to a use case. No business logic here.
8. **Use case** — orchestrates domain logic. Calls repository interfaces, value objects, domain exceptions.
9. **Repository** (`PrismaServiceRepository` / `RedisTokenRepository`) — translates domain calls to DB/cache queries. Converts Prisma records to domain entities.
10. **Domain entity / value object** — pure TypeScript, no framework knowledge.
11. **Response flows back** — use case returns result, controller maps to plain response object (no passwords, no internal IDs unless needed), interceptor logs duration, response sent.

**On any unhandled exception:** `GlobalExceptionFilter` catches it, maps `AppException` subtypes to HTTP status codes, and returns the standard `{ message, code, details, timestamp, requestId }` shape.
