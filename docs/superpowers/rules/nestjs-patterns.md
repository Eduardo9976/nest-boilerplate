# NestJS Coding Patterns — poc-nest

Padrões concretos usados neste projeto. Seguir exatamente ao criar novos módulos/features.

---

## 1. Módulo completo — estrutura de arquivos

Para um novo módulo `orders`:

```
src/modules/orders/
├── domain/
│   ├── order.entity.ts
│   ├── value-objects/
│   │   └── order-status.vo.ts
│   └── repositories/
│       └── order.repository.interface.ts
├── application/
│   └── use-cases/
│       ├── create-order.use-case.ts
│       └── create-order.use-case.spec.ts
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

```typescript
// domain/order.entity.ts
import type { OrderStatus } from './value-objects/order-status.vo';

export interface OrderProps {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: Date;
}

export class Order {
  private constructor(private readonly props: OrderProps) {}

  static create(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get status(): OrderStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
}
```

**Regras:**
- `private constructor` + `static create()` — construtor privado
- Getters com return type explícito
- Zero imports de NestJS, Prisma, ou qualquer lib externa

---

## 3. Value Object

```typescript
// domain/value-objects/email.vo.ts
export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error(`Invalid email: ${raw}`);
    }
    return new Email(normalized);
  }

  toString(): string { return this.value; }
}
```

---

## 4. Repository Interface (domain)

```typescript
// domain/repositories/order.repository.interface.ts
import type { Order } from '../order.entity';

export interface CreateOrderData {
  id: string;
  userId: string;
  status: string;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  create(data: CreateOrderData): Promise<Order>;
}
```

---

## 5. Use Case

```typescript
// application/use-cases/create-order.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/repositories/order.repository.interface';
import type { Order } from '../../domain/order.entity';
import { NotFoundException } from '../../../../shared/exceptions/not-found.exception';

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

## 6. Repository Implementation (infrastructure)

```typescript
// infrastructure/prisma-order.repository.ts
import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CreateOrderData, IOrderRepository } from '../domain/repositories/order.repository.interface';
import type { Order } from '../domain/order.entity';
import { OrderEntity } from '../domain/order.entity';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const r = await this.prisma.order.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async create(data: CreateOrderData): Promise<Order> {
    const r = await this.prisma.order.create({ data });
    return this.toDomain(r);
  }

  private toDomain(r: { id: string; userId: string; status: string; createdAt: Date }): Order {
    return OrderEntity.create({ ...r });
  }
}
```

---

## 7. Controller

```typescript
// presentation/orders.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { CreateOrderSchema, type CreateOrderDto } from './dtos/create-order.dto';
import type { Role } from '../domain/order.entity';

interface OrderResponse {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
}

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.createOrder.execute({ userId: dto.userId });
    return { id: order.id, userId: order.userId, status: order.status, createdAt: order.createdAt };
  }
}
```

**Regras:**
- Return type explícito em todos os handlers
- Usar interface inline ou `interface XxxResponse` para o retorno
- `@Public()` para rotas abertas, nada para rotas protegidas (guard global)
- `ZodValidationPipe` sempre como argumento do decorator `@Body()`/`@Query()`/`@Param()`

---

## 8. DTO (Zod)

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

## 9. Module

```typescript
// orders.module.ts
import { Module } from '@nestjs/common';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository';
import { OrdersController } from './presentation/orders.controller';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface';

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

## 10. Estratégia Passport (JWT)

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

## 11. Exceções de domínio

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

## 12. Decorators disponíveis

```typescript
@Public()          // rota pública — sem JWT requerido
@Roles('ADMIN')    // marca role (teams adicionam RolesGuard para enforçar)
```
