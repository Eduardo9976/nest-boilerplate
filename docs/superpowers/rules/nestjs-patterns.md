# NestJS Coding Patterns — poc-nest

Padrões concretos usados neste projeto. Seguir exatamente ao criar novos módulos/features.

---

## 1. Módulo completo — estrutura de arquivos

Para um novo módulo `orders`:

```
src/modules/orders/
├── domain/
│   ├── order.entity.ts
│   └── order.repository.ts
├── use-cases/
│   ├── create-order.use-case.ts
│   └── create-order.use-case.spec.ts
├── infrastructure/
│   └── prisma-order.repository.ts
├── presentation/
│   ├── orders.controller.ts
│   └── dtos/
│       └── create-order.dto.ts
└── orders.module.ts
```

---

## 2. Entidade de domínio

Plain interface — sem private constructor, sem static factory, sem value objects.
Validação de formato fica nos Zod schemas dos DTOs.

```typescript
// domain/order.entity.ts
export interface Order {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
}
```

**Regras:**
- Plain `interface` — sem lógica, sem métodos
- Zero imports de NestJS, Prisma, ou qualquer lib externa
- Status como `string` (ou union type se houver enum fixo)

---

## 3. Repository Interface (domain)

```typescript
// domain/order.repository.ts
import type { Order } from './order.entity';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  create(data: Omit<Order, 'createdAt'>): Promise<Order>;
}
```

**Regras:**
- Symbol token no mesmo arquivo da interface (sem subdir `repositories/`)
- `Omit<Order, 'createdAt'>` para input de create — banco gera `createdAt`

---

## 4. Use Case

```typescript
// use-cases/create-order.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IOrderRepository, ORDER_REPOSITORY } from '../domain/order.repository';
import type { Order } from '../domain/order.entity';
import { NotFoundException } from '../../../shared/exceptions/not-found.exception';

export interface CreateOrderInput {
  userId: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    // validação de negócio aqui, usando exceções do domain
    return this.repo.create({
      id: crypto.randomUUID(),
      userId: input.userId,
      status: 'PENDING',
    });
  }
}
```

**Regras:**
- `@Inject(TOKEN)` para repositórios — nunca inject via classe concreta
- Exceções de negócio: sempre `AppException` subtypes (NotFoundException, ConflictException, etc.)
- Nunca `throw new HttpException` dentro de use cases
- Return type explícito em todos os métodos públicos

---

## 5. Repository Implementation (infrastructure)

```typescript
// infrastructure/prisma-order.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { IOrderRepository } from '../domain/order.repository';
import type { Order } from '../domain/order.entity';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({ where: { userId } });
  }

  async create(data: Omit<Order, 'createdAt'>): Promise<Order> {
    return this.prisma.order.create({ data });
  }
}
```

**Sem mapeamento manual.** Prisma retorna o shape exato da interface — sem `toDomain()` intermediário enquanto os campos coincidirem.

---

## 6. Controller

```typescript
// presentation/orders.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateOrderUseCase } from '../use-cases/create-order.use-case';
import { CreateOrderSchema, type CreateOrderDto } from './dtos/create-order.dto';
import type { Order } from '../domain/order.entity';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
  ): Promise<Order> {
    return this.createOrder.execute({ userId: dto.userId });
  }
}
```

**Regras:**
- Return type explícito em todos os handlers
- Usar interface inline ou `interface XxxResponse` para o retorno
- `@Public()` para rotas abertas, nada para rotas protegidas (guard global)
- `ZodValidationPipe` sempre como argumento do decorator `@Body()`/`@Query()`/`@Param()`

---

## 7. DTO (Zod)

```typescript
// presentation/dtos/create-order.dto.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
```

**Regras:**
- Schema + tipo derivado com `z.infer<>`
- Sem classes, sem decorators
- Schemas compõem via `.extend()`, `.merge()`, `.pick()`, `.omit()`

---

## 8. Module

```typescript
// orders.module.ts
import { Module } from '@nestjs/common';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository';
import { OrdersController } from './presentation/orders.controller';
import { ORDER_REPOSITORY } from './domain/order.repository';

@Module({
  controllers: [OrdersController],
  providers: [
    CreateOrderUseCase,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
  ],
  exports: [CreateOrderUseCase],
})
export class OrdersModule {}
```

---

## 9. Estratégia Passport (JWT)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || '',
    });
  }

  validate(payload: { sub: string }): { userId: string } {
    return { userId: payload.sub };
  }
}
```

O retorno do `validate()` é o `req.user` nas rotas protegidas.

---

## 10. Exceções de domínio

```typescript
// Importar de shared/exceptions — NUNCA de @nestjs/common dentro de use cases

import { NotFoundException } from '../../../shared/exceptions/not-found.exception';
import { UnauthorizedException } from '../../../shared/exceptions/unauthorized.exception';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';
import { ValidationException } from '../../../shared/exceptions/validation.exception';

// Uso
throw new NotFoundException('Order not found');
throw new ConflictException('Duplicate order');
throw new ValidationException('Invalid data', [{ field: 'email', message: 'Invalid format' }]);
```

---

## 11. Decorators disponíveis

```typescript
@Public()          // rota pública — sem JWT requerido
@Roles('ADMIN')    // marca role (teams adicionam RolesGuard para enforçar)
```
