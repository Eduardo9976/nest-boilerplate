# How to Create a New Module

Example: adding a `products` module.

## 1. Create the folder structure

```
src/modules/products/
├── domain/
│   ├── product.entity.ts
│   ├── value-objects/
│   └── repositories/
│       └── product.repository.interface.ts
├── application/
│   └── use-cases/
│       ├── create-product.use-case.ts
│       └── create-product.use-case.spec.ts
├── infrastructure/
│   └── prisma-product.repository.ts
├── presentation/
│   ├── products.controller.ts
│   └── dtos/
│       └── create-product.dto.ts
└── products.module.ts
```

## 2. Define the domain entity

```typescript
// domain/product.entity.ts
export interface ProductProps {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}

export class Product {
  private constructor(private readonly props: ProductProps) {}
  static create(props: ProductProps): Product { return new Product(props); }
  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get price() { return this.props.price; }
}
```

## 3. Define the repository interface (domain layer)

```typescript
// domain/repositories/product.repository.interface.ts
import { Product } from '../product.entity';
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  create(data: { id: string; name: string; price: number }): Promise<Product>;
}
```

## 4. Write the use case TDD-style

```typescript
// application/use-cases/create-product.use-case.spec.ts
it('creates a product', async () => {
  mockRepo.create.mockResolvedValue(Product.create({ id: '1', name: 'Widget', price: 9.99, createdAt: new Date() }));
  const result = await useCase.execute({ name: 'Widget', price: 9.99 });
  expect(result.name).toBe('Widget');
});
```

```typescript
// application/use-cases/create-product.use-case.ts
@Injectable()
export class CreateProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository) {}
  async execute(input: { name: string; price: number }): Promise<Product> {
    return this.repo.create({ id: crypto.randomUUID(), ...input });
  }
}
```

## 5. Implement the Prisma repository

```typescript
// infrastructure/prisma-product.repository.ts
@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: { id: string; name: string; price: number }): Promise<Product> {
    const r = await this.prisma.product.create({ data });
    return Product.create({ id: r.id, name: r.name, price: r.price, createdAt: r.createdAt });
  }
}
```

## 6. Add the Prisma model

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

## 7. Wire the module

```typescript
// products.module.ts
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
