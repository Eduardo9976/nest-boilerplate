# Categories Module Design

**Date:** 2026-05-11
**Status:** Approved

## Overview

New `categories` module (full CRUD) following existing clean architecture. `Service.category` (plain string) replaced with `Service.categoryId` FK → `Category`. Deleting a category cascades to its services.

---

## Prisma Schema

### New model

```prisma
model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  services    Service[]
}
```

### Service model — updated

```prisma
model Service {
  id                String    @id @default(uuid())
  name              String    @unique
  description       String?
  durationInMinutes Int
  price             Float
  isActive          Boolean   @default(true)
  categoryId        String
  category          Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  imageUrl          String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

**Migration:** drop `category` string column, add `categoryId` FK. Safe to reset — nothing in production.

---

## Categories Module Structure

```
src/modules/categories/
  domain/
    category.entity.ts
    category.repository.ts
  use-cases/
    create-category.use-case.ts
    find-one-category.use-case.ts
    find-category-by.use-case.ts
    update-category.use-case.ts
    delete-category.use-case.ts
  infrastructure/
    prisma-category.repository.ts
  presentation/
    dtos/
      create-category.dto.ts
      update-category.dto.ts
      find-one-category.dto.ts
      category-response.dto.ts
    categories.controller.ts
    categories.mapper.ts
  categories.module.ts
```

### Domain

**`category.entity.ts`**
```ts
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**`category.repository.ts`** — exposes:
- `CATEGORY_REPOSITORY` symbol token
- `CategoryRepository` interface with: `findOne`, `findBy`, `create`, `update`, `delete`
- Type aliases: `CategoryId`, `FindOneCategoryFilters`, `FindByCategoryFilters`, `CategoryData`, `UpdateCategoryInput`

### Use Cases

| Class | Behavior |
|-------|----------|
| `CreateCategoryUseCase` | Normalizes name; throws `ConflictException` if duplicate |
| `FindOneCategoryUseCase` | By id or name; throws `NotFoundException` if not found |
| `FindCategoryByUseCase` | Filtered list (name, isActive) |
| `UpdateCategoryUseCase` | Partial update; throws `NotFoundException`; throws `ConflictException` if new name conflicts |
| `DeleteCategoryUseCase` | Deletes by id; throws `NotFoundException` if not found |

### Endpoints

| Method | Path | Use Case |
|--------|------|----------|
| POST | `/categories` | `CreateCategoryUseCase` |
| GET | `/categories` | `FindCategoryByUseCase` |
| GET | `/categories/:identifier` | `FindOneCategoryUseCase` (UUID or name) |
| PATCH | `/categories/:id` | `UpdateCategoryUseCase` |
| DELETE | `/categories/:id` | `DeleteCategoryUseCase` |

### Infrastructure

`PrismaCategoryRepository` implements `CategoryRepository` via `PrismaService`. Follows same pattern as `PrismaServiceRepository`.

---

## Services Module Changes

| File | Change |
|------|--------|
| `service.entity.ts` | `category: string` → `categoryId: string` |
| `service.repository.ts` | `ServiceData`, filter types: `category` → `categoryId` |
| `prisma-service.repository.ts` | No logic change; Prisma uses `categoryId` post-migration |
| `create-service.use-case.ts` | Validate `categoryId` exists via `FindOneCategoryUseCase`; throw `NotFoundException` if not |
| `services.module.ts` | Import `CategoriesModule` (exports `FindOneCategoryUseCase`) |
| `service-response.dto.ts` | Expose `categoryId` string; no join |

---

## Testing

### New spec files

```
categories/use-cases/create-category.use-case.spec.ts
categories/use-cases/find-one-category.use-case.spec.ts
categories/use-cases/find-category-by.use-case.spec.ts
categories/use-cases/update-category.use-case.spec.ts
categories/use-cases/delete-category.use-case.spec.ts
```

### Test cases per use-case

| Use Case | Cases |
|----------|-------|
| create | success; `ConflictException` on duplicate name |
| find-one | returns category; `NotFoundException` if missing |
| find-by | returns filtered list |
| update | updates partial fields; `NotFoundException` if missing; `ConflictException` if name taken |
| delete | deletes; `NotFoundException` if missing |

### Services use-case changes

`create-service.use-case.spec.ts` — add case: `NotFoundException` when `categoryId` not found.

---

## Dependency Flow

```
CategoriesController → CreateCategoryUseCase → CategoryRepository ← PrismaCategoryRepository
ServicesController → CreateServiceUseCase → FindOneCategoryUseCase + ServiceRepository
```

`CategoriesModule` exports `FindOneCategoryUseCase` for import by `ServicesModule`.
