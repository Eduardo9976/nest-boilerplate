# Categories Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a full CRUD `categories` module and replace `Service.category: string` with a proper FK `Service.categoryId → Category`.

**Architecture:** New `categories` module follows the same clean architecture as `services` (domain → use-cases → infrastructure → presentation). `Service.category` string column is dropped; `categoryId` UUID FK added with `onDelete: Cascade` so deleting a category cascades to its services. `CategoriesModule` exports `FindOneCategoryUseCase` which `ServicesModule` imports to validate `categoryId` on service creation.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, Zod + nestjs-zod, Jest

---

## File Map

### New files
| Path | Role |
|------|------|
| `src/modules/categories/domain/category.entity.ts` | `Category` interface |
| `src/modules/categories/domain/category.repository.ts` | `CategoryRepository` interface + `CATEGORY_REPOSITORY` token + types |
| `src/modules/categories/use-cases/create-category.use-case.ts` | Create with name dedup |
| `src/modules/categories/use-cases/create-category.use-case.spec.ts` | Unit tests |
| `src/modules/categories/use-cases/find-one-category.use-case.ts` | Find by id or name; throws NotFoundException |
| `src/modules/categories/use-cases/find-one-category.use-case.spec.ts` | Unit tests |
| `src/modules/categories/use-cases/find-category-by.use-case.ts` | Filtered list |
| `src/modules/categories/use-cases/find-category-by.use-case.spec.ts` | Unit tests |
| `src/modules/categories/use-cases/update-category.use-case.ts` | Partial update |
| `src/modules/categories/use-cases/update-category.use-case.spec.ts` | Unit tests |
| `src/modules/categories/use-cases/delete-category.use-case.ts` | Delete by id |
| `src/modules/categories/use-cases/delete-category.use-case.spec.ts` | Unit tests |
| `src/modules/categories/infrastructure/prisma-category.repository.ts` | Prisma impl of `CategoryRepository` |
| `src/modules/categories/presentation/dtos/create-category.dto.ts` | POST body |
| `src/modules/categories/presentation/dtos/update-category.dto.ts` | PATCH body |
| `src/modules/categories/presentation/dtos/find-one-category.dto.ts` | Path param |
| `src/modules/categories/presentation/dtos/find-category.dto.ts` | Query params |
| `src/modules/categories/presentation/dtos/category-response.dto.ts` | Response shape |
| `src/modules/categories/presentation/categories.controller.ts` | 5 endpoints |
| `src/modules/categories/presentation/categories.mapper.ts` | Domain → DTO |
| `src/modules/categories/categories.module.ts` | NestJS module |

### Modified files
| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Category` model; `Service.category String` → `Service.categoryId String` FK |
| `src/modules/services/domain/service.entity.ts` | `category: string` → `categoryId: string` |
| `src/modules/services/domain/service.repository.ts` | `ServiceData` picks `categoryId`; remove `category` |
| `src/modules/services/use-cases/create-service.use-case.ts` | Inject `FindOneCategoryUseCase`; validate `categoryId` |
| `src/modules/services/use-cases/create-service.use-case.spec.ts` | Add mock + NotFoundException test; update `makeService`/input |
| `src/modules/services/presentation/dtos/create-service.dto.ts` | `category: z.string()` → `categoryId: z.string().uuid()` |
| `src/modules/services/presentation/dtos/service-response.dto.ts` | `category: z.string()` → `categoryId: z.string().uuid()` |
| `src/modules/services/presentation/services.mapper.ts` | `service.category` → `service.categoryId` |
| `src/modules/services/presentation/services.controller.ts` | `dto.category` → `dto.categoryId` |
| `src/modules/services/services.module.ts` | `imports: [CategoriesModule]` |
| `src/app.module.ts` | Add `CategoriesModule` to imports |

---

## Task 1: Prisma schema — add Category model and Service FK

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema.prisma**

Replace the existing `Service` model and add the `Category` model:

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

- [ ] **Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add-categories-and-service-fk
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: `@prisma/client` types updated with `Category` model and `Service.categoryId`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add Category model and Service.categoryId FK"
```

---

## Task 2: Category domain layer

**Files:**
- Create: `src/modules/categories/domain/category.entity.ts`
- Create: `src/modules/categories/domain/category.repository.ts`

- [ ] **Step 1: Create category.entity.ts**

```typescript
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create category.repository.ts**

```typescript
import type { Category } from './category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export type CategoryId = Category['id'];

export type FindOneCategoryFilters = { id: CategoryId } | { name: Category['name'] };

export type FindByCategoryFilters = Partial<Pick<Category, 'id' | 'name' | 'isActive'>>;

export type CategoryData = Pick<Category, 'name' | 'isActive'> & {
  description?: string;
};

export type UpdateCategoryInput = Partial<Omit<CategoryData, never>> & { id: CategoryId };

export interface CategoryRepository {
  findOne(filter: FindOneCategoryFilters): Promise<Category | null>;
  findBy(filter: FindByCategoryFilters): Promise<Category[]>;
  create(data: CategoryData): Promise<Category>;
  update(input: UpdateCategoryInput): Promise<Category>;
  delete(id: CategoryId): Promise<void>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/categories/domain/
git commit -m "feat(categories): domain layer — entity and repository interface"
```

---

## Task 3: CreateCategoryUseCase (TDD)

**Files:**
- Create: `src/modules/categories/use-cases/create-category.use-case.spec.ts`
- Create: `src/modules/categories/use-cases/create-category.use-case.ts`

- [ ] **Step 1: Write failing test**

Create `src/modules/categories/use-cases/create-category.use-case.spec.ts`:

```typescript
import { CreateCategoryUseCase } from './create-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    description: 'serviços de cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const input = {
    name: 'Cabelo',
    description: 'Serviços de Cabelo',
    isActive: true,
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateCategoryUseCase(mockRepo);
  });

  it('creates category and normalizes name to lowercase', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeCategory());

    const result = await useCase.execute(input);

    expect(result.name).toBe('cabelo');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cabelo', description: 'Serviços de Cabelo' }),
    );
  });

  it('throws ConflictException when category name already exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeCategory());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test create-category.use-case
```

Expected: FAIL — `Cannot find module './create-category.use-case'`

- [ ] **Step 3: Implement CreateCategoryUseCase**

Create `src/modules/categories/use-cases/create-category.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryData,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: CategoryData): Promise<Category> {
    const name = input.name.trim().toLowerCase();

    const existing = await this.categoryRepository.findOne({ name });
    if (existing) throw new ConflictException('Category already exists');

    return this.categoryRepository.create({ ...input, name });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test create-category.use-case
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/use-cases/create-category.use-case.ts src/modules/categories/use-cases/create-category.use-case.spec.ts
git commit -m "feat(categories): CreateCategoryUseCase with tests"
```

---

## Task 4: FindOneCategoryUseCase (TDD)

**Files:**
- Create: `src/modules/categories/use-cases/find-one-category.use-case.spec.ts`
- Create: `src/modules/categories/use-cases/find-one-category.use-case.ts`

- [ ] **Step 1: Write failing test**

Create `src/modules/categories/use-cases/find-one-category.use-case.spec.ts`:

```typescript
import { FindOneCategoryUseCase } from './find-one-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

describe('FindOneCategoryUseCase', () => {
  let useCase: FindOneCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new FindOneCategoryUseCase(mockRepo);
  });

  it('returns category when found by id', async () => {
    const category = makeCategory();
    mockRepo.findOne.mockResolvedValue(category);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBe(category);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ id: 'uuid-1' });
  });

  it('returns category when found by name', async () => {
    const category = makeCategory();
    mockRepo.findOne.mockResolvedValue(category);

    const result = await useCase.execute({ name: 'cabelo' });

    expect(result).toBe(category);
  });

  it('throws NotFoundException when category not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'uuid-1' })).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test find-one-category.use-case
```

Expected: FAIL — `Cannot find module './find-one-category.use-case'`

- [ ] **Step 3: Implement FindOneCategoryUseCase**

Create `src/modules/categories/use-cases/find-one-category.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  FindOneCategoryFilters,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

@Injectable()
export class FindOneCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(filter: FindOneCategoryFilters): Promise<Category> {
    const category = await this.categoryRepository.findOne(filter);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test find-one-category.use-case
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/use-cases/find-one-category.use-case.ts src/modules/categories/use-cases/find-one-category.use-case.spec.ts
git commit -m "feat(categories): FindOneCategoryUseCase with tests"
```

---

## Task 5: FindCategoryByUseCase (TDD)

**Files:**
- Create: `src/modules/categories/use-cases/find-category-by.use-case.spec.ts`
- Create: `src/modules/categories/use-cases/find-category-by.use-case.ts`

- [ ] **Step 1: Write failing test**

Create `src/modules/categories/use-cases/find-category-by.use-case.spec.ts`:

```typescript
import { FindCategoryByUseCase } from './find-category-by.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';

describe('FindCategoryByUseCase', () => {
  let useCase: FindCategoryByUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new FindCategoryByUseCase(mockRepo);
  });

  it('returns filtered categories', async () => {
    const categories = [makeCategory()];
    mockRepo.findBy.mockResolvedValue(categories);

    const result = await useCase.execute({ isActive: true });

    expect(result).toBe(categories);
    expect(mockRepo.findBy).toHaveBeenCalledWith({ isActive: true });
  });

  it('returns empty array when no categories match', async () => {
    mockRepo.findBy.mockResolvedValue([]);

    const result = await useCase.execute({ name: 'nonexistent' });

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test find-category-by.use-case
```

Expected: FAIL — `Cannot find module './find-category-by.use-case'`

- [ ] **Step 3: Implement FindCategoryByUseCase**

Create `src/modules/categories/use-cases/find-category-by.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  FindByCategoryFilters,
  CategoryRepository,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';

@Injectable()
export class FindCategoryByUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  execute(filter: FindByCategoryFilters): Promise<Category[]> {
    return this.categoryRepository.findBy(filter);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test find-category-by.use-case
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/use-cases/find-category-by.use-case.ts src/modules/categories/use-cases/find-category-by.use-case.spec.ts
git commit -m "feat(categories): FindCategoryByUseCase with tests"
```

---

## Task 6: UpdateCategoryUseCase (TDD)

**Files:**
- Create: `src/modules/categories/use-cases/update-category.use-case.spec.ts`
- Create: `src/modules/categories/use-cases/update-category.use-case.ts`

- [ ] **Step 1: Write failing test**

Create `src/modules/categories/use-cases/update-category.use-case.spec.ts`:

```typescript
import { UpdateCategoryUseCase } from './update-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new UpdateCategoryUseCase(mockRepo);
  });

  it('updates category and normalizes name to lowercase', async () => {
    const existing = makeCategory();
    const updated = makeCategory({ name: 'barba' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    mockRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute({ id: 'uuid-1', name: 'Barba' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uuid-1', name: 'barba' }),
    );
    expect(result.name).toBe('barba');
  });

  it('throws NotFoundException when category does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'uuid-1', name: 'barba' })).rejects.toThrow(NotFoundException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when new name already taken by another category', async () => {
    const existing = makeCategory({ id: 'uuid-1' });
    const conflict = makeCategory({ id: 'uuid-2', name: 'barba' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(conflict);

    await expect(useCase.execute({ id: 'uuid-1', name: 'barba' })).rejects.toThrow(ConflictException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('allows updating name to same value as current (no self-conflict)', async () => {
    const existing = makeCategory({ id: 'uuid-1', name: 'cabelo' });
    mockRepo.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    mockRepo.update.mockResolvedValue(existing);

    await expect(useCase.execute({ id: 'uuid-1', name: 'cabelo' })).resolves.toBeDefined();
    expect(mockRepo.update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test update-category.use-case
```

Expected: FAIL — `Cannot find module './update-category.use-case'`

- [ ] **Step 3: Implement UpdateCategoryUseCase**

Create `src/modules/categories/use-cases/update-category.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
  UpdateCategoryInput,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.categoryRepository.findOne({ id: input.id });
    if (!existing) throw new NotFoundException('Category not found');

    const data: UpdateCategoryInput = { id: input.id };

    if (input.name !== undefined) {
      const name = input.name.trim().toLowerCase();
      const conflict = await this.categoryRepository.findOne({ name });
      if (conflict && conflict.id !== input.id) {
        throw new ConflictException('Category name already exists');
      }
      data.name = name;
    }

    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return this.categoryRepository.update(data);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test update-category.use-case
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/use-cases/update-category.use-case.ts src/modules/categories/use-cases/update-category.use-case.spec.ts
git commit -m "feat(categories): UpdateCategoryUseCase with tests"
```

---

## Task 7: DeleteCategoryUseCase (TDD)

**Files:**
- Create: `src/modules/categories/use-cases/delete-category.use-case.spec.ts`
- Create: `src/modules/categories/use-cases/delete-category.use-case.ts`

- [ ] **Step 1: Write failing test**

Create `src/modules/categories/use-cases/delete-category.use-case.spec.ts`:

```typescript
import { DeleteCategoryUseCase } from './delete-category.use-case';
import type { CategoryRepository } from '../domain/category.repository';
import type { Category } from '../domain/category.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
  let mockRepo: jest.Mocked<CategoryRepository>;

  const makeCategory = (): Category => ({
    id: 'uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new DeleteCategoryUseCase(mockRepo);
  });

  it('deletes category when it exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeCategory());
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('uuid-1')).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('uuid-1');
  });

  it('throws NotFoundException when category does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute('uuid-1')).rejects.toThrow(NotFoundException);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test delete-category.use-case
```

Expected: FAIL — `Cannot find module './delete-category.use-case'`

- [ ] **Step 3: Implement DeleteCategoryUseCase**

Create `src/modules/categories/use-cases/delete-category.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryId,
  CategoryRepository,
} from '../domain/category.repository';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(id: CategoryId): Promise<void> {
    const existing = await this.categoryRepository.findOne({ id });
    if (!existing) throw new NotFoundException('Category not found');
    await this.categoryRepository.delete(id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test delete-category.use-case
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/use-cases/delete-category.use-case.ts src/modules/categories/use-cases/delete-category.use-case.spec.ts
git commit -m "feat(categories): DeleteCategoryUseCase with tests"
```

---

## Task 8: PrismaCategoryRepository

**Files:**
- Create: `src/modules/categories/infrastructure/prisma-category.repository.ts`

- [ ] **Step 1: Create the repository**

```typescript
import { Injectable } from '@nestjs/common';
import {
  CategoryId,
  CategoryRepository,
  CategoryData,
  FindByCategoryFilters,
  FindOneCategoryFilters,
  UpdateCategoryInput,
} from '../domain/category.repository';
import { Category } from '../domain/category.entity';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(filter: FindOneCategoryFilters): Promise<Category | null> {
    const record = await this.prisma.category.findFirst({ where: filter });
    return record ? this.toEntity(record as Category) : null;
  }

  async findBy(filters: FindByCategoryFilters): Promise<Category[]> {
    const records = await this.prisma.category.findMany({ where: filters });
    return records.map((r) => this.toEntity(r as Category));
  }

  async create(data: CategoryData): Promise<Category> {
    const record = await this.prisma.category.create({ data });
    return this.toEntity(record as Category);
  }

  async update(input: UpdateCategoryInput): Promise<Category> {
    const { id, ...data } = input;
    const record = await this.prisma.category.update({ where: { id }, data });
    return this.toEntity(record as Category);
  }

  async delete(id: CategoryId): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  private toEntity(record: Category): Category {
    return record;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/categories/infrastructure/prisma-category.repository.ts
git commit -m "feat(categories): PrismaCategoryRepository"
```

---

## Task 9: Category presentation layer

**Files:**
- Create: `src/modules/categories/presentation/dtos/create-category.dto.ts`
- Create: `src/modules/categories/presentation/dtos/update-category.dto.ts`
- Create: `src/modules/categories/presentation/dtos/find-one-category.dto.ts`
- Create: `src/modules/categories/presentation/dtos/find-category.dto.ts`
- Create: `src/modules/categories/presentation/dtos/category-response.dto.ts`
- Create: `src/modules/categories/presentation/categories.mapper.ts`
- Create: `src/modules/categories/presentation/categories.controller.ts`

- [ ] **Step 1: Create create-category.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100).describe('Nome da categoria'),
  description: z.string().min(8).max(255).optional().describe('Descrição da categoria'),
  isActive: z.boolean().default(true),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
```

- [ ] **Step 2: Create update-category.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(8).max(255).optional(),
  isActive: z.boolean().optional(),
});

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
```

- [ ] **Step 3: Create find-one-category.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindOneCategorySchema = z.object({
  identifier: z.string().min(1),
});

export class FindOneCategoryDto extends createZodDto(FindOneCategorySchema) {}
```

- [ ] **Step 4: Create find-category.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindCategorySchema = z.object({
  name: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export class FindCategoryDto extends createZodDto(FindCategorySchema) {}
```

- [ ] **Step 5: Create category-response.dto.ts**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CategoryResponseSchema = z.object({
  id: z.string().uuid().describe('ID da categoria'),
  name: z.string().describe('Nome da categoria'),
  description: z.string().optional().describe('Descrição da categoria'),
  isActive: z.boolean(),
  createdAt: z.string().datetime().describe('Data de criação em ISO 8601'),
  updatedAt: z.string().datetime().describe('Data de atualização em ISO 8601'),
});

export class CategoryResponseDto extends createZodDto(CategoryResponseSchema) {}
```

- [ ] **Step 6: Create categories.mapper.ts**

```typescript
import type { Category } from '../domain/category.entity';
import type { CategoryResponseDto } from './dtos/category-response.dto';

export class CategoriesMapper {
  static toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    } as CategoryResponseDto;
  }

  static toResponseList(categories: Category[]): CategoryResponseDto[] {
    return categories.map((c) => CategoriesMapper.toResponse(c));
  }
}
```

- [ ] **Step 7: Create categories.controller.ts**

```typescript
import { z } from 'zod';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateCategoryDto, CreateCategorySchema } from './dtos/create-category.dto';
import { UpdateCategoryDto, UpdateCategorySchema } from './dtos/update-category.dto';
import { FindOneCategoryDto, FindOneCategorySchema } from './dtos/find-one-category.dto';
import { FindCategoryDto, FindCategorySchema } from './dtos/find-category.dto';
import { CategoryResponseDto } from './dtos/category-response.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';
import { CreateCategoryUseCase } from '../use-cases/create-category.use-case';
import { FindOneCategoryUseCase } from '../use-cases/find-one-category.use-case';
import { FindCategoryByUseCase } from '../use-cases/find-category-by.use-case';
import { UpdateCategoryUseCase } from '../use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../use-cases/delete-category.use-case';
import { CategoriesMapper } from './categories.mapper';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly findOneCategory: FindOneCategoryUseCase,
    private readonly findCategoryBy: FindCategoryByUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova categoria' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Categoria criada', type: CategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado', type: ErrorResponseDto })
  async create(
    @Body(new ZodValidationPipe(CreateCategorySchema)) dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.createCategory.execute({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar categorias com filtros' })
  @ApiResponse({ status: 200, description: 'Lista de categorias', type: [CategoryResponseDto] })
  async findBy(
    @Query(new ZodValidationPipe(FindCategorySchema)) query: FindCategoryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.findCategoryBy.execute(query);
    return CategoriesMapper.toResponseList(categories);
  }

  @Public()
  @Get(':identifier')
  @ApiOperation({ summary: 'Buscar categoria por ID ou nome' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  async findOne(
    @Param(new ZodValidationPipe(FindOneCategorySchema)) params: FindOneCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { identifier } = params;
    const isUuid = z.string().uuid().safeParse(identifier).success;
    const filter = isUuid ? { id: identifier } : { name: identifier };

    const category = await this.findOneCategory.execute(filter);
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'Categoria atualizada', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já em uso', type: ErrorResponseDto })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.updateCategory.execute({ id, ...dto });
    return CategoriesMapper.toResponse(category);
  }

  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar categoria (cascade: deleta services vinculados)' })
  @ApiResponse({ status: 204, description: 'Categoria deletada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ErrorResponseDto })
  async delete(@Param('id') id: string): Promise<void> {
    await this.deleteCategory.execute(id);
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/categories/presentation/
git commit -m "feat(categories): presentation layer — DTOs, mapper, controller"
```

---

## Task 10: CategoriesModule + register in AppModule

**Files:**
- Create: `src/modules/categories/categories.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create categories.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { CategoriesController } from './presentation/categories.controller';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { FindOneCategoryUseCase } from './use-cases/find-one-category.use-case';
import { FindCategoryByUseCase } from './use-cases/find-category-by.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case';
import { CATEGORY_REPOSITORY } from './domain/category.repository';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';

@Module({
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    FindOneCategoryUseCase,
    FindCategoryByUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  exports: [FindOneCategoryUseCase],
})
export class CategoriesModule {}
```

- [ ] **Step 2: Update app.module.ts**

Add `CategoriesModule` to imports (insert after `ServicesModule`):

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { ServicesModule } from './modules/services/services.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [AppConfigModule, PrismaModule, RedisModule, UsersModule, AuthModule, CategoriesModule, ServicesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

Note: `CategoriesModule` must appear before `ServicesModule` in imports because `ServicesModule` imports `CategoriesModule`.

- [ ] **Step 3: Run all category tests**

```bash
pnpm test --testPathPattern=categories
```

Expected: all 13 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/modules/categories/categories.module.ts src/app.module.ts
git commit -m "feat(categories): wire CategoriesModule into AppModule"
```

---

## Task 11: Update Service domain layer

**Files:**
- Modify: `src/modules/services/domain/service.entity.ts`
- Modify: `src/modules/services/domain/service.repository.ts`

- [ ] **Step 1: Update service.entity.ts**

Replace `category: string` with `categoryId: string`:

```typescript
export interface Service {
  id: string;
  name: string;
  description?: string;
  durationInMinutes: number;
  price: number;
  isActive: boolean;
  categoryId: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Update service.repository.ts**

Replace `'category'` with `'categoryId'` in `ServiceData`:

```typescript
import type { Service } from './service.entity';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export type ServiceId = Service['id'];

export type FindOneServiceFilters = { id: ServiceId } | { name: Service['name'] };

export type FindByServiceFilters = Partial<Pick<Service, 'id' | 'name' | 'isActive'>>;

export type ServiceData = Pick<
  Service,
  'name' | 'description' | 'durationInMinutes' | 'price' | 'isActive' | 'imageUrl' | 'categoryId'
>;

export type UpdateServiceRepositoryInput = Partial<ServiceData> & { id: ServiceId };

export interface ServiceRepository {
  findOne(filter: FindOneServiceFilters): Promise<Service | null>;
  findBy(filter: FindByServiceFilters): Promise<Service[]>;
  create(data: ServiceData): Promise<Service>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/services/domain/
git commit -m "refactor(services): category string → categoryId FK in domain layer"
```

---

## Task 12: Update CreateServiceUseCase — validate categoryId (TDD)

**Files:**
- Modify: `src/modules/services/use-cases/create-service.use-case.spec.ts`
- Modify: `src/modules/services/use-cases/create-service.use-case.ts`

- [ ] **Step 1: Update the spec**

Replace the full content of `src/modules/services/use-cases/create-service.use-case.spec.ts`:

```typescript
import { CreateServiceUseCase } from './create-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { FindOneCategoryUseCase } from '../../categories/use-cases/find-one-category.use-case';
import type { Category } from '../../categories/domain/category.entity';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;
  let mockFindOneCategory: jest.Mocked<Pick<FindOneCategoryUseCase, 'execute'>>;

  const makeCategory = (): Category => ({
    id: 'cat-uuid-1',
    name: 'cabelo',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    description: 'corte de cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    categoryId: 'cat-uuid-1',
    imageUrl: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const input = {
    name: 'Corte',
    description: 'Corte de Cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    categoryId: 'cat-uuid-1',
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    mockFindOneCategory = { execute: jest.fn() };
    useCase = new CreateServiceUseCase(
      mockRepo,
      mockFindOneCategory as unknown as FindOneCategoryUseCase,
    );
  });

  it('creates service and normalizes name/description to lowercase', async () => {
    mockFindOneCategory.execute.mockResolvedValue(makeCategory());
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeService());

    const result = await useCase.execute(input);

    expect(result.name).toBe('corte');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'corte', description: 'corte de cabelo' }),
    );
  });

  it('throws ConflictException when service name already exists', async () => {
    mockFindOneCategory.execute.mockResolvedValue(makeCategory());
    mockRepo.findOne.mockResolvedValue(makeService());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when categoryId does not exist', async () => {
    mockFindOneCategory.execute.mockRejectedValue(new NotFoundException('Category not found'));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test create-service.use-case
```

Expected: FAIL — constructor argument count mismatch or `categoryId` not found

- [ ] **Step 3: Update CreateServiceUseCase**

Replace the full content of `src/modules/services/use-cases/create-service.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REPOSITORY, ServiceData, ServiceRepository } from '../domain/service.repository';
import { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';
import { FindOneCategoryUseCase } from '../../categories/use-cases/find-one-category.use-case';

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository,
    private readonly findOneCategory: FindOneCategoryUseCase,
  ) {}

  async execute(input: ServiceData): Promise<Service> {
    const name = input.name.trim().toLowerCase();
    const description = input.description?.trim().toLowerCase();
    const imageUrl = input.imageUrl?.trim().toLowerCase();

    await this.findOneCategory.execute({ id: input.categoryId });

    const existing = await this.serviceRepository.findOne({ name });
    if (existing) throw new ConflictException('Service already exists');

    return this.serviceRepository.create({ ...input, name, description, imageUrl });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test create-service.use-case
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/modules/services/use-cases/create-service.use-case.ts src/modules/services/use-cases/create-service.use-case.spec.ts
git commit -m "feat(services): validate categoryId exists on service creation"
```

---

## Task 13: Update Services presentation and module

**Files:**
- Modify: `src/modules/services/presentation/dtos/create-service.dto.ts`
- Modify: `src/modules/services/presentation/dtos/service-response.dto.ts`
- Modify: `src/modules/services/presentation/services.mapper.ts`
- Modify: `src/modules/services/presentation/services.controller.ts`
- Modify: `src/modules/services/services.module.ts`

- [ ] **Step 1: Update create-service.dto.ts**

Replace `category: z.string()` with `categoryId: z.string().uuid()`:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(100).describe('Nome do serviço'),
  description: z.string().min(8).max(100).optional().describe('Descrição do serviço'),
  durationInMinutes: z.number().positive().describe('Tempo de duração do serviço'),
  price: z.coerce.number().positive().describe('Preço do serviço'),
  isActive: z.boolean().default(true),
  imageUrl: z.string().min(8).max(100).optional().describe('Url da imagem'),
  categoryId: z.string().uuid().describe('ID da categoria'),
});

export class CreateServiceDto extends createZodDto(CreateServiceSchema) {}
```

- [ ] **Step 2: Update service-response.dto.ts**

Replace `category: z.string()` with `categoryId: z.string().uuid()`:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ServiceResponseSchema = z.object({
  id: z.string().uuid().describe('ID do serviço'),
  name: z.string().describe('Nome do serviço'),
  description: z.string().optional().describe('Descrição do serviço'),
  durationInMinutes: z.number().positive().describe('Tempo de duração do serviço'),
  price: z.coerce.number().positive().describe('Preço do serviço'),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional().describe('Url da imagem'),
  categoryId: z.string().uuid().describe('ID da categoria'),
  createdAt: z.string().datetime().describe('Data de criação em ISO 8601'),
  updatedAt: z.string().datetime().describe('Data de atualização em ISO 8601'),
});

export class ServiceResponseDto extends createZodDto(ServiceResponseSchema) {}
```

- [ ] **Step 3: Update services.mapper.ts**

Replace `category: service.category` with `categoryId: service.categoryId`:

```typescript
import type { Service } from '../domain/service.entity';
import type { ServiceResponseDto } from './dtos/service-response.dto';

export class ServicesMapper {
  static toResponse(service: Service): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationInMinutes: service.durationInMinutes,
      price: service.price,
      isActive: service.isActive,
      imageUrl: service.imageUrl,
      categoryId: service.categoryId,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    } as ServiceResponseDto;
  }

  static toResponseList(services: Service[]): ServiceResponseDto[] {
    return services.map((s) => ServicesMapper.toResponse(s));
  }
}
```

- [ ] **Step 4: Update services.controller.ts**

In the `create` method, replace `category: dto.category` with `categoryId: dto.categoryId`:

```typescript
const service = await this.createService.execute({
  name: dto.name,
  description: dto.description,
  durationInMinutes: dto.durationInMinutes,
  price: dto.price,
  categoryId: dto.categoryId,
  isActive: dto.isActive,
  imageUrl: dto.imageUrl,
});
```

- [ ] **Step 5: Update services.module.ts**

Add `imports: [CategoriesModule]`:

```typescript
import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from './use-cases/create-service.use-case';
import { SERVICE_REPOSITORY } from './domain/service.repository';
import { PrismaServiceRepository } from './infrastructure/prisma-service.repository';
import { ServicesController } from './presentation/services.controller';
import { FindOneServiceUseCase } from './use-cases/find-one-service.use-case';
import { FindServiceByUseCase } from './use-cases/find-service-by.use-case';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ServicesController],
  providers: [
    FindOneServiceUseCase,
    FindServiceByUseCase,
    CreateServiceUseCase,
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
  ],
  exports: [CreateServiceUseCase, FindOneServiceUseCase, FindServiceByUseCase],
})
export class ServicesModule {}
```

- [ ] **Step 6: Run all tests**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/modules/services/
git commit -m "refactor(services): wire categoryId FK in presentation and module"
```

---

## Verification

- [ ] Start dev server and verify endpoints respond

```bash
pnpm start:dev
```

- Create a category: `POST /categories` `{ "name": "Cabelo", "isActive": true }`
- List categories: `GET /categories`
- Create a service with the returned `categoryId`: `POST /services` `{ ..., "categoryId": "<uuid>" }`
- Delete category: `DELETE /categories/<uuid>` — confirm service is also deleted (`GET /services/:id` returns 404)
