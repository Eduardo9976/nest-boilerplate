# Testing Patterns — poc-nest

---

## Estrutura geral

| Tipo | Config | Pattern | Infra |
|---|---|---|---|
| Unit | `jest.config.ts` | `src/**/*.spec.ts` | nenhuma (mocks em memória) |
| E2E | `jest-e2e.config.ts` | `test/e2e/**/*.e2e-spec.ts` | Postgres + Redis reais (`.env.test`) |

**Meta unit:** < 5ms por teste. Sem NestJS test module. Sem Prisma. Sem Redis.

---

## Padrão de mock para use cases (via interface)

Quando o use case recebe uma interface via `@Inject`, use `jest.Mocked<T>`:

```typescript
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';

let mockRepo: jest.Mocked<IUserRepository>;

beforeEach(() => {
  mockRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    create: jest.fn(),
  };
  useCase = new CreateUserUseCase(mockRepo);
});
```

`jest.Mocked<T>` dá type-safety completa nas assertivas: `mockRepo.findByEmail.mockResolvedValue(...)`.

---

## Padrão de mock para classes externas (partial mock)

Quando precisar mockar uma classe que não implementa uma interface pura (ex: `JwtService`, `ConfigService`), use `as unknown as T`:

```typescript
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { FindUserByEmailUseCase } from '../../users/application/use-cases/find-user-by-email.use-case';

const mockJwtService = { sign: jest.fn().mockReturnValue('signed-token') };
const mockConfigService = { get: jest.fn((key: string) => configMap[key]) };
const mockFindByEmail = { execute: jest.fn() };

useCase = new JwtLoginUseCase(
  mockFindByEmail as unknown as FindUserByEmailUseCase,  // ← correto
  mockValidatePassword,                                  // ← sem cast se interface bate
  mockJwtService as unknown as JwtService,               // ← correto
  mockTokenRepo,                                         // ← sem cast se bate
  mockConfigService as unknown as ConfigService,         // ← correto
);
```

**Nunca usar `as any`** — viola a regra `@typescript-eslint/no-explicit-any`.  
**Padrão:** `as unknown as T` para mocks parciais de classes.

---

## Helper para criar User em testes

```typescript
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';

const makeUser = (email: string): User =>
  User.create({
    id: 'uuid-1',
    email: Email.create(email),
    password: null,
    googleId: null,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makeUserWithPassword = async (plain: string | null): Promise<User> => {
  const hash = plain ? await bcrypt.hash(plain, 10) : null;
  return User.create({
    id: 'uuid-1',
    email: Email.create('test@example.com'),
    password: hash ? Password.fromHash(hash) : null,
    googleId: null,
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};
```

---

## Assertivas de exceção

```typescript
// throw síncrono
expect(() => fn()).toThrow(ConflictException);

// throw assíncrono
await expect(useCase.execute(input)).rejects.toThrow(UnauthorizedException);

// resolve
await expect(useCase.execute(input)).resolves.toBeUndefined();
```

---

## Estrutura de spec file

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepo: jest.Mocked<IUserRepository>;

  // helpers locais (sem efeito colateral)
  const makeUser = (email: string): User => User.create({ ... });

  beforeEach(() => {
    jest.clearAllMocks();   // sempre limpar entre testes
    mockRepo = { ... };
    useCase = new UseCase(mockRepo);
  });

  it('descrição do comportamento esperado', async () => { ... });
  it('throws X when Y', async () => { ... });
});
```

---

## TDD flow (para novos use cases)

1. Criar o spec file com os testes (vai falhar: "module not found")
2. `pnpm jest --testPathPattern="nome-do-use-case"` — confirmar FAIL
3. Criar a implementação
4. `pnpm jest --testPathPattern="nome-do-use-case"` — confirmar PASS
5. Rodar `pnpm test` — confirmar que não quebrou nada

---

## E2E Tests

### AppFactory

```typescript
// test/helpers/app-factory.ts
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(...);
  await app.init();
  return app;
}
```

### DbCleaner

```typescript
// test/helpers/db-cleaner.ts
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany();
  // ordem: filho antes do pai (foreign keys)
}
```

### Estrutura e2e

```typescript
describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with token pair on valid credentials', async () => {
    // setup: criar user no banco
    // act: chamar via supertest
    // assert: verificar response
  });
});
```

---

## Regra sobre `unbound-method` em specs

ESLint rule `@typescript-eslint/unbound-method` está **desabilitado para `*.spec.ts`** — é falso positivo com `jest.Mocked<T>`. Configurado no `eslint.config.mjs`:

```js
{
  files: ['**/*.spec.ts', '**/*.test.ts'],
  rules: {
    '@typescript-eslint/unbound-method': 'off',
  },
},
```

Assertivas como `expect(mockRepo.findByEmail).toHaveBeenCalledWith(...)` são válidas.
