# Services Module — Clean Architecture Audit & Standardized Response Design

Date: 2026-05-11

## Scope

1. Fix services module clean architecture violations
2. Add global `{data: ...}` success response wrapper (all modules)
3. Write unit tests for services use cases

---

## 1. Global Response Wrapper

### New files

**`src/shared/dtos/api-response.dto.ts`**
Zod schema: `z.object({ data: z.unknown() })`. Type-inferred `ApiResponseDto`.

**`src/shared/interceptors/transform-response.interceptor.ts`**
`TransformResponseInterceptor implements NestInterceptor`.
Maps any success return → `{ data: value }`.
`void` / `undefined` returns → `{ data: null }`.

### Registration

`main.ts`: `app.useGlobalInterceptors(new TransformResponseInterceptor())` — alongside existing `GlobalExceptionFilter`.

### Scope

All endpoints including auth (`login`, `refresh`, `logout`, `google/callback`).

---

## 2. Services Module Fixes

### Missing DTOs

**`src/modules/services/presentation/dtos/find-one-service.dto.ts`**
Zod schema for path param `{ identifier: string }`.

**`src/modules/services/presentation/dtos/find-service.dto.ts`**
Zod schema for query params matching `FindByServiceFilters` (fields: `category?`, `isActive?`).

### Missing mapper

**`src/modules/services/presentation/mappers/services.mapper.ts`**
Class `ServicesMapper` with static `toResponse(service: Service): ServiceResponseDto`.

### Bug fix: `findBy` null return

`domain/service.repository.ts`: `findBy` returns `Promise<Service[]>` not `Promise<Service[] | null>`.
`infrastructure/prisma-service.repository.ts`: return `[]` not `null` on no results.
`use-cases/find-service-by.use-case.ts`: return type updated accordingly.

---

## 3. Unit Tests

### Files (co-located with use cases)

**`create-service.use-case.spec.ts`**
- creates and returns entity via repository
- propagates repository errors

**`find-one-service.use-case.spec.ts`**
- returns entity when found
- returns null when not found

**`find-service-by.use-case.spec.ts`**
- returns array when results exist
- returns empty array when no results

### Constraints

- All deps mocked via `jest.fn()`
- No DB, no Prisma
- One `describe` per class, one `it` per behavior
- Pattern identical to users module

---

## Architecture Dependency Rule

```
domain ← use-cases ← infrastructure/presentation
```

No framework imports in domain. No Prisma in use cases. No domain logic in controllers.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/shared/dtos/api-response.dto.ts` | Create |
| `src/shared/interceptors/transform-response.interceptor.ts` | Create |
| `src/main.ts` | Update — register interceptor |
| `src/modules/services/presentation/dtos/find-one-service.dto.ts` | Create |
| `src/modules/services/presentation/dtos/find-service.dto.ts` | Create |
| `src/modules/services/presentation/mappers/services.mapper.ts` | Create |
| `src/modules/services/domain/service.repository.ts` | Fix `findBy` return type |
| `src/modules/services/infrastructure/prisma-service.repository.ts` | Fix `findBy` null → `[]` |
| `src/modules/services/use-cases/find-service-by.use-case.ts` | Fix return type |
| `src/modules/services/use-cases/create-service.use-case.spec.ts` | Create |
| `src/modules/services/use-cases/find-one-service.use-case.spec.ts` | Create |
| `src/modules/services/use-cases/find-service-by.use-case.spec.ts` | Create |
