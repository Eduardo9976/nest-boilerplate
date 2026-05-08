# Design Decisions

## Prisma over TypeORM

TypeORM's `synchronize: true` silently drops columns in production — a well-documented footgun. Prisma's schema-first workflow makes every migration explicit and reviewable. The generated client provides type-safe query results without `as unknown as MyType` casts. Prisma's `@prisma/client` is also significantly smaller than TypeORM.

## Zod over class-validator

`class-validator` requires DTOs to be classes with decorator annotations. This couples the shape of your data to how you validate it. Zod schemas are plain values — they can be composed, passed around, and tested independently. `z.infer<typeof Schema>` ensures the type and the validator are always in sync; there's no way to have a validated field that isn't in the type.

## Clean Architecture (not DDD-lite)

DDD's structural extras — rich entities with private constructors, value objects, domain events — pay off in large systems with complex, frequently-changing business rules. For a project at this scale, they add ceremony without tangible benefit: value objects duplicate validation already handled by Zod, and rich entities make simple CRUD operations unnecessarily verbose.

This project uses Clean Architecture's core principles — explicit layer separation, dependency inversion via repository interfaces, use cases as the business rule boundary — without the DDD overhead. Entities are plain TypeScript interfaces. Validation lives in Zod schemas. The structure remains easy to escalate to DDD per module if a specific domain genuinely needs it.

## Per-module layers over global layer folders

Navigating to a feature via `src/modules/users/` is faster than navigating via `src/domain/users/`. When a module grows large enough to extract into a microservice, everything it needs is already in one folder. Global layer folders force cross-folder navigation for a single feature and slow teams down.

## `AsyncLocalStorage` for `requestId`

Passing `requestId` through every function signature pollutes interfaces with infrastructure concerns. `AsyncLocalStorage` provides request-scoped context injection — the same pattern used by OpenTelemetry and distributed tracing frameworks. Any part of the call stack can call `RequestContext.get()?.requestId` without a single extra function parameter.

## `Symbol` for injection tokens

Using a `Symbol` (`USER_REPOSITORY`, `REDIS_TOKEN_REPOSITORY`) instead of a string ensures injection tokens are globally unique and can't accidentally collide across modules. It also makes "find all usages" trivial — grep for the symbol name, not a magic string.
