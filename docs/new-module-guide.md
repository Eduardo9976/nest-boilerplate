# How to Create a New Module

Example: adding a `products` module.

## 1. Create the folder structure

```
src/modules/products/
├── domain/
│   ├── product.entity.ts
│   └── product.repository.ts
├── use-cases/
│   ├── create-product.use-case.ts
│   └── create-product.use-case.spec.ts
├── infrastructure/
│   └── prisma-product.repository.ts
├── presentation/
│   ├── products.controller.ts
│   └── dtos/
│       ├── create-product.dto.ts
│       └── product-response.dto.ts
└── products.module.ts
```

## 2. Define the domain entity

Plain interface — no private constructor, no value objects. Validation lives in Zod DTOs.

```typescript
// domain/product.entity.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

## 3. Define the repository interface

```typescript
// domain/product.repository.ts
import type { Product } from './product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  create(data: Omit<Product, 'createdAt'>): Promise<Product>;
}
```

## 4. Write the use case TDD-style

```typescript
// use-cases/create-product.use-case.spec.ts
it('creates a product', async () => {
  const now = new Date();
  mockRepo.create.mockResolvedValue({ id: '1', name: 'Widget', price: 9.99, createdAt: now });
  const result = await useCase.execute({ name: 'Widget', price: 9.99 });
  expect(result.name).toBe('Widget');
});
```

```typescript
// use-cases/create-product.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IProductRepository, PRODUCT_REPOSITORY } from '../domain/product.repository';
import type { Product } from '../domain/product.entity';

export interface CreateProductInput {
  name: string;
  price: number;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    return this.repo.create({ id: crypto.randomUUID(), ...input });
  }
}
```

## 5. Implement the Prisma repository

```typescript
// infrastructure/prisma-product.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { IProductRepository } from '../domain/product.repository';
import type { Product } from '../domain/product.entity';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async create(data: Omit<Product, 'createdAt'>): Promise<Product> {
    return this.prisma.product.create({ data });
  }
}
```

## 6. Add the controller and DTOs

```typescript
// presentation/dtos/create-product.dto.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
```

```typescript
// presentation/products.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateProductUseCase } from '../use-cases/create-product.use-case';
import { CreateProductSchema, type CreateProductDto } from './dtos/create-product.dto';
import type { Product } from '../domain/product.entity';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly createProduct: CreateProductUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto,
  ): Promise<Product> {
    return this.createProduct.execute(dto);
  }
}
```

## 7. Add the Prisma model

In `prisma/schema.prisma`:
```prisma
model Product {
  id        String   @id @default(uuid())
  name      String
  price     Float
  createdAt DateTime @default(now())
}
```

Then: `pnpm prisma migrate dev --name add-products`

## 8. Wire the module

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';
import { ProductsController } from './presentation/products.controller';
import { PRODUCT_REPOSITORY } from './domain/product.repository';

@Module({
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
})
export class ProductsModule {}
```

Add `ProductsModule` to `app.module.ts` imports.

---

## Validation — which layer validates what

### Overview

| Layer | Validates | Throws | When |
|---|---|---|---|
| **Presentation (Zod)** | Input format, types, required fields | `ValidationException` (422) via `ZodValidationPipe` | Before use case runs |
| **Use Case** | Business rules, state invariants | `AppException` subtypes (409, 404, 401…) | Inside `execute()` |
| **Infrastructure** | Nothing intentionally — DB constraints are last resort | Prisma errors (bubble up as 500) | Never catch and re-throw |

**Rule of thumb:** if validating the input requires a DB lookup or business context, it belongs in the use case. If it can be decided by looking at the value alone, it belongs in the DTO.

---

### Presentation layer — Zod DTOs

Validate **shape and format** only. No DB calls, no business logic.

```typescript
// presentation/dtos/create-product.dto.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'name cannot be empty')
    .max(100, 'name too long'),
  price: z
    .number({ required_error: 'price is required' })
    .positive('price must be greater than 0')
    .max(999_999, 'price out of range'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
```

`ZodValidationPipe` throws `ValidationException` automatically. No `try/catch` needed in the controller.

**What to validate here:**
- Required fields, null/undefined
- String min/max length
- Number range (`positive()`, `.min()`, `.max()`)
- Format: email, UUID, URL, date string
- Enum membership (`z.enum(['ACTIVE', 'INACTIVE'])`)
- Cross-field format rules (`z.refine()`)

**What NOT to validate here:**
- ❌ "Does this `categoryId` exist in the database?" — needs a DB call → use case
- ❌ "Is this user allowed to set this price?" — business rule → use case
- ❌ "Is this product name already taken?" — uniqueness → use case

---

### Use Case layer — business rules

Validate **state and invariants** that require context (DB lookups, permissions, domain rules).

```typescript
// use-cases/create-product.use-case.ts
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    // ✅ Business rule: category must exist
    const category = await this.categoryRepo.findById(input.categoryId);
    if (!category) throw new NotFoundException('Category not found');

    // ✅ Business rule: no duplicate names within the same category
    const duplicate = await this.productRepo.findByNameAndCategory(input.name, input.categoryId);
    if (duplicate) throw new ConflictException('Product name already exists in this category');

    // ✅ Business rule: premium-only pricing threshold
    if (input.price > 10_000 && !input.isPremiumSeller) {
      throw new ValidationException('Price above 10,000 requires a premium seller account', [
        { field: 'price', message: 'Exceeds limit for standard accounts' },
      ]);
    }

    return this.productRepo.create({ id: crypto.randomUUID(), ...input });
  }
}
```

**What to validate here:**
- Entity existence (`findById` returning null)
- Uniqueness constraints with business meaning ("duplicate name in category")
- Permission / role checks ("only ADMIN can set negative prices")
- Business state invariants ("order can only be cancelled if status is PENDING")
- Cross-entity rules ("user can have at most 5 active listings")

**What NOT to validate here:**
- ❌ `if (!input.name)` — Zod already guarantees `name` is a non-empty string
- ❌ `if (input.price <= 0)` — Zod schema has `.positive()`, this is unreachable
- ❌ HTTP status codes — throw `AppException` subtypes, never `HttpException`

---

### Infrastructure layer — no intentional validation

The repository just persists and retrieves. Prisma's unique/not-null constraints are a safety net, not the primary validation path.

```typescript
// infrastructure/prisma-product.repository.ts
async create(data: Omit<Product, 'createdAt'>): Promise<Product> {
  // ✅ No validation here — trust that use case already checked
  return this.prisma.product.create({ data });
  // If Prisma throws a unique constraint error (P2002), it bubbles up as 500.
  // Prevent this by validating uniqueness in the use case instead.
}
```

If you need to surface a Prisma constraint error as a 409, catch it **in the repository** and convert to an `AppException` — but only if it's truly impossible to pre-check in the use case:

```typescript
import { Prisma } from '@prisma/client';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

async create(data: Omit<Product, 'createdAt'>): Promise<Product> {
  try {
    return await this.prisma.product.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Product already exists');
    }
    throw e;
  }
}
```

Use this pattern sparingly — prefer use-case-level uniqueness checks for better error messages and testability.

---

### End-to-end validation flow

```
POST /products  { name: "", price: -5, categoryId: "not-a-uuid" }
        │
        ▼
  ZodValidationPipe ──► ValidationException 422
  { message: "Validation failed",
    details: [
      { field: "name", message: "name cannot be empty" },
      { field: "price", message: "price must be greater than 0" },
      { field: "categoryId", message: "categoryId must be a valid UUID" }
    ] }

POST /products  { name: "Widget", price: 9.99, categoryId: "valid-uuid-but-missing" }
        │
        ▼
  ZodValidationPipe ──► passes (shape is valid)
        │
        ▼
  CreateProductUseCase.execute()
        │
        ▼
  categoryRepo.findById("valid-uuid-but-missing") ──► null
        │
        ▼
  throw new NotFoundException("Category not found") ──► 404

POST /products  { name: "Widget", price: 9.99, categoryId: "existing-category-uuid" }
        │
        ▼
  ZodValidationPipe ──► passes
        │
        ▼
  CreateProductUseCase.execute()
        │
        ▼
  category found, no duplicate name ──► productRepo.create() ──► 201
```

---

### Cross-field validation in Zod (`.refine()`)

Use `.refine()` for rules that span multiple fields but need no DB call:

```typescript
export const CreateDiscountSchema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    discountPct: z.number().min(1).max(100),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });
```

If the cross-field rule requires a DB call (e.g. "end date must be after the product's creation date"), move it to the use case.