# Services Module — Clean Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix services module clean-architecture violations, add global `{data: ...}` success response wrapper, and write unit tests for all three service use cases.

**Architecture:** `TransformResponseInterceptor` wraps all success responses in `{data: value}` globally (mirrors `GlobalExceptionFilter` for errors). Missing DTOs and mapper are created so the controller compiles. Domain `findBy` return type is corrected from `Service[] | null` to `Service[]`.

**Tech Stack:** NestJS 11 · Zod · nestjs-zod · Jest · RxJS (`map` operator)

---

## File Map

| Action | Path |
|--------|------|
| Fix | `src/modules/services/domain/service.repository.ts` |
| Fix | `src/modules/services/use-cases/find-service-by.use-case.ts` |
| Fix | `src/modules/services/use-cases/create-service.use-case.ts` |
| Fix | `src/modules/services/presentation/services.controller.ts` |
| Create | `src/modules/services/presentation/dtos/find-one-service.dto.ts` |
| Create | `src/modules/services/presentation/dtos/find-service.dto.ts` |
| Create | `src/modules/services/presentation/services.mapper.ts` |
| Create | `src/shared/dtos/api-response.dto.ts` |
| Create | `src/shared/interceptors/transform-response.interceptor.ts` |
| Create | `src/shared/interceptors/transform-response.interceptor.spec.ts` |
| Fix | `src/main.ts` |
| Create | `src/modules/services/use-cases/create-service.use-case.spec.ts` |
| Create | `src/modules/services/use-cases/find-one-service.use-case.spec.ts` |
| Create | `src/modules/services/use-cases/find-service-by.use-case.spec.ts` |

---

### Task 1: Fix `findBy` return type in domain interface

The Prisma implementation already returns `Service[]` (never null). The interface is inconsistent — fix it.

**Files:**
- Modify: `src/modules/services/domain/service.repository.ts`

- [ ] **Step 1: Update the interface**

Replace line 32 in `service.repository.ts`:

```typescript
findBy(filter: FindByServiceFilters): Promise<Service[]>;
```

Full file after change:

```typescript
import type { Service } from './service.entity';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export type ServiceId = Service['id'];

export type FindOneServiceFilters = { id: ServiceId } | { name: Service['name'] };

export type FindByServiceFilters = Partial<Pick<Service, 'id' | 'name' | 'isActive'>>;

export type ServiceData = Pick<
  Service,
  'name' | 'description' | 'durationInMinutes' | 'price' | 'isActive' | 'imageUrl' | 'category'
>;

export type UpdateServiceRepositoryInput = Partial<ServiceData> & { id: ServiceId };

export interface ServiceRepository {
  findOne(filter: FindOneServiceFilters): Promise<Service | null>;
  findBy(filter: FindByServiceFilters): Promise<Service[]>;
  create(data: ServiceData): Promise<Service>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/services/domain/service.repository.ts
git commit -m "fix(services): correct findBy return type Service[] | null -> Service[]"
```

---

### Task 2: Fix `findBy` return type in use case + simplify controller

**Files:**
- Modify: `src/modules/services/use-cases/find-service-by.use-case.ts`
- Modify: `src/modules/services/presentation/services.controller.ts`

- [ ] **Step 1: Fix use case return type**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { FindByServiceFilters, SERVICE_REPOSITORY, ServiceRepository } from '../domain/service.repository';
import { Service } from '../domain/service.entity';

@Injectable()
export class FindServiceByUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  execute(filter: FindByServiceFilters): Promise<Service[]> {
    return this.serviceRepository.findBy(filter);
  }
}
```

- [ ] **Step 2: Simplify controller `findBy` method**

The `services ? ... : []` ternary is always truthy now that `findBy` returns `Service[]`. Replace the method body:

```typescript
async findBy(
  @Query(new ZodValidationPipe(FindServiceSchema)) query: FindServiceDto,
): Promise<ServiceResponseDto[]> {
  const services = await this.findServiceBy.execute(query);
  return ServicesMapper.toResponseList(services);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/services/use-cases/find-service-by.use-case.ts \
        src/modules/services/presentation/services.controller.ts
git commit -m "fix(services): remove null from findBy return type, simplify controller"
```

---

### Task 3: Fix ConflictException import in CreateServiceUseCase

CLAUDE.md rule: throw from `shared/exceptions/`, not `@nestjs/common`.

**Files:**
- Modify: `src/modules/services/use-cases/create-service.use-case.ts`

- [ ] **Step 1: Replace NestJS ConflictException with shared exception**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REPOSITORY, ServiceData, ServiceRepository } from '../domain/service.repository';
import { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

@Injectable()
export class CreateServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly serviceRepository: ServiceRepository) {}

  async execute(input: ServiceData): Promise<Service> {
    const name = input.name.trim().toLowerCase();
    const description = input.description?.trim().toLowerCase();
    const imageUrl = input.imageUrl?.trim().toLowerCase();

    const existing = await this.serviceRepository.findOne({ name });
    if (existing) throw new ConflictException('Service already exists');

    return this.serviceRepository.create({ ...input, name, description, imageUrl });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/services/use-cases/create-service.use-case.ts
git commit -m "fix(services): use shared ConflictException instead of @nestjs/common"
```

---

### Task 4: Create FindOneServiceDto

Path param `identifier` is a string that can be a UUID or a name — the controller resolves which.

**Files:**
- Create: `src/modules/services/presentation/dtos/find-one-service.dto.ts`

- [ ] **Step 1: Create DTO file**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindOneServiceSchema = z.object({
  identifier: z.string().min(1),
});

export class FindOneServiceDto extends createZodDto(FindOneServiceSchema) {}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/services/presentation/dtos/find-one-service.dto.ts
git commit -m "feat(services): add FindOneServiceDto for path param validation"
```

---

### Task 5: Create FindServiceDto

Query params mapped to `FindByServiceFilters`. `isActive` coerced from string (`"true"/"false"`) to boolean.

**Files:**
- Create: `src/modules/services/presentation/dtos/find-service.dto.ts`

- [ ] **Step 1: Create DTO file**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const FindServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export class FindServiceDto extends createZodDto(FindServiceSchema) {}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/services/presentation/dtos/find-service.dto.ts
git commit -m "feat(services): add FindServiceDto for query param validation"
```

---

### Task 6: Create ServicesMapper

Maps `Service` domain entity → `ServiceResponseDto`. Converts `Date` fields to ISO strings.

**Files:**
- Create: `src/modules/services/presentation/services.mapper.ts`

- [ ] **Step 1: Create mapper file**

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
      category: service.category,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    } as ServiceResponseDto;
  }

  static toResponseList(services: Service[]): ServiceResponseDto[] {
    return services.map((s) => ServicesMapper.toResponse(s));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/services/presentation/services.mapper.ts
git commit -m "feat(services): add ServicesMapper to convert domain entity to response DTO"
```

---

### Task 7: Create TransformResponseInterceptor (TDD)

**Files:**
- Create: `src/shared/interceptors/transform-response.interceptor.spec.ts`
- Create: `src/shared/interceptors/transform-response.interceptor.ts`
- Create: `src/shared/dtos/api-response.dto.ts`

- [ ] **Step 1: Write failing tests**

Create `src/shared/interceptors/transform-response.interceptor.spec.ts`:

```typescript
import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
  });

  it('wraps a value in { data: value }', (done) => {
    const next = { handle: () => of({ id: '1' }) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1' } });
      done();
    });
  });

  it('maps undefined to { data: null }', (done) => {
    const next = { handle: () => of(undefined) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('maps null to { data: null }', (done) => {
    const next = { handle: () => of(null) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('wraps an array in { data: array }', (done) => {
    const next = { handle: () => of([1, 2, 3]) } as CallHandler;
    interceptor.intercept({} as ExecutionContext, next).subscribe((result) => {
      expect(result).toEqual({ data: [1, 2, 3] });
      done();
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test src/shared/interceptors/transform-response.interceptor.spec.ts
```

Expected: FAIL with `Cannot find module './transform-response.interceptor'`.

- [ ] **Step 3: Create ApiResponseDto**

Create `src/shared/dtos/api-response.dto.ts`:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ApiResponseSchema = z.object({
  data: z.unknown(),
});

export class ApiResponseDto extends createZodDto(ApiResponseSchema) {}
```

- [ ] **Step 4: Create the interceptor**

Create `src/shared/interceptors/transform-response.interceptor.ts`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<{ data: unknown }> {
    return next.handle().pipe(
      map((value: unknown) => ({ data: value ?? null })),
    );
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm test src/shared/interceptors/transform-response.interceptor.spec.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/interceptors/transform-response.interceptor.ts \
        src/shared/interceptors/transform-response.interceptor.spec.ts \
        src/shared/dtos/api-response.dto.ts
git commit -m "feat(shared): add TransformResponseInterceptor wrapping success responses in {data}"
```

---

### Task 8: Register interceptor in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Import and register**

Add the import and register the interceptor alongside `LoggingInterceptor`:

```typescript
// dotenv must be loaded before any module file is evaluated
import * as dotenv from 'dotenv';
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformResponseInterceptor());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS Boilerplate API')
      .setDescription('Enterprise NestJS boilerplate — Clean Architecture, JWT, Google OAuth')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Autenticação JWT e Google OAuth')
      .addTag('users', 'Gerenciamento de usuários')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  process.stdout.write(`Application running on port ${port}\n`);
}

void bootstrap();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): register TransformResponseInterceptor globally"
```

---

### Task 9: Unit tests — CreateServiceUseCase

**Files:**
- Create: `src/modules/services/use-cases/create-service.use-case.spec.ts`

- [ ] **Step 1: Create test file**

```typescript
import { CreateServiceUseCase } from './create-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    description: 'corte de cabelo',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    category: 'cabelo',
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
    category: 'cabelo',
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new CreateServiceUseCase(mockRepo);
  });

  it('creates service and normalizes name/description to lowercase', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeService());

    const result = await useCase.execute(input);

    expect(result.name).toBe('corte');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'corte', description: 'corte de cabelo' }),
    );
  });

  it('throws ConflictException when service name already exists', async () => {
    mockRepo.findOne.mockResolvedValue(makeService());

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
pnpm test src/modules/services/use-cases/create-service.use-case.spec.ts
```

Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/modules/services/use-cases/create-service.use-case.spec.ts
git commit -m "test(services): add unit tests for CreateServiceUseCase"
```

---

### Task 10: Unit tests — FindOneServiceUseCase

**Files:**
- Create: `src/modules/services/use-cases/find-one-service.use-case.spec.ts`

- [ ] **Step 1: Create test file**

```typescript
import { FindOneServiceUseCase } from './find-one-service.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';

describe('FindOneServiceUseCase', () => {
  let useCase: FindOneServiceUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    category: 'cabelo',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new FindOneServiceUseCase(mockRepo);
  });

  it('returns service when found by id', async () => {
    const service = makeService();
    mockRepo.findOne.mockResolvedValue(service);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBe(service);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ id: 'uuid-1' });
  });

  it('returns service when found by name', async () => {
    const service = makeService();
    mockRepo.findOne.mockResolvedValue(service);

    const result = await useCase.execute({ name: 'corte' });

    expect(result).toBe(service);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ name: 'corte' });
  });

  it('returns null when service not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const result = await useCase.execute({ id: 'uuid-1' });

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
pnpm test src/modules/services/use-cases/find-one-service.use-case.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add src/modules/services/use-cases/find-one-service.use-case.spec.ts
git commit -m "test(services): add unit tests for FindOneServiceUseCase"
```

---

### Task 11: Unit tests — FindServiceByUseCase

**Files:**
- Create: `src/modules/services/use-cases/find-service-by.use-case.spec.ts`

- [ ] **Step 1: Create test file**

```typescript
import { FindServiceByUseCase } from './find-service-by.use-case';
import type { ServiceRepository } from '../domain/service.repository';
import type { Service } from '../domain/service.entity';

describe('FindServiceByUseCase', () => {
  let useCase: FindServiceByUseCase;
  let mockRepo: jest.Mocked<ServiceRepository>;

  const makeService = (): Service => ({
    id: 'uuid-1',
    name: 'corte',
    durationInMinutes: 30,
    price: 50,
    isActive: true,
    category: 'cabelo',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
    };
    useCase = new FindServiceByUseCase(mockRepo);
  });

  it('returns array of services matching filter', async () => {
    const services = [makeService()];
    mockRepo.findBy.mockResolvedValue(services);

    const result = await useCase.execute({ isActive: true });

    expect(result).toEqual(services);
    expect(mockRepo.findBy).toHaveBeenCalledWith({ isActive: true });
  });

  it('returns empty array when no services match', async () => {
    mockRepo.findBy.mockResolvedValue([]);

    const result = await useCase.execute({ name: 'nonexistent' });

    expect(result).toEqual([]);
  });

  it('delegates empty filter to repository', async () => {
    mockRepo.findBy.mockResolvedValue([makeService()]);

    await useCase.execute({});

    expect(mockRepo.findBy).toHaveBeenCalledWith({});
  });
});
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
pnpm test src/modules/services/use-cases/find-service-by.use-case.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests still pass, new tests included.

- [ ] **Step 4: Commit**

```bash
git add src/modules/services/use-cases/find-service-by.use-case.spec.ts
git commit -m "test(services): add unit tests for FindServiceByUseCase"
```
