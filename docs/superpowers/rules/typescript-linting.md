# TypeScript, ESLint & Prettier — poc-nest

## Stack de linting

| Ferramenta | Versão | Config |
|---|---|---|
| ESLint | 10 | `eslint.config.mjs` (flat config) |
| typescript-eslint | 8 | `recommendedTypeChecked` |
| eslint-config-prettier | 10 | desabilita regras que conflitam com Prettier |
| eslint-plugin-unused-imports | 4 | detecta imports/vars não usados |
| Prettier | 3 | `.prettierrc` |

---

## ESLint — regras ativas (principais)

### Obrigatórias (error)

| Regra | O que exige |
|---|---|
| `@typescript-eslint/explicit-function-return-type` | Return type explícito em funções exportadas (não-expressões) |
| `@typescript-eslint/explicit-module-boundary-types` | Return type em todos os métodos públicos de classes exportadas |
| `@typescript-eslint/no-explicit-any` | Proibido `any` — usar `unknown` ou tipo concreto |
| `@typescript-eslint/consistent-type-imports` | Type-only imports devem usar `import type` |
| `@typescript-eslint/no-floating-promises` | Promises devem ser awaited ou marcadas com `void` |
| `@typescript-eslint/no-misused-promises` | Proibido passar promises onde esperado void (com `checksVoidReturn: false`) |
| `unused-imports/no-unused-imports` | Imports não usados removidos |

### Override para spec files

`@typescript-eslint/unbound-method` é **off** em `*.spec.ts` e `*.test.ts` (falso positivo com `jest.Mocked<T>`).

---

## Prettier — configuração

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

---

## Padrões de tipo corretos

### 1. Return types explícitos

```typescript
// ✓ correto
async onModuleInit(): Promise<void> { ... }
get id(): string { return this.props.id; }
validate(payload: { sub: string }): { userId: string } { ... }

// ✗ errado
async onModuleInit() { ... }
get id() { return this.props.id; }
```

### 2. Type-only imports

```typescript
// ✓ correto
import type { Role } from '../domain/user.entity';
import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import { type Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

// ✗ errado
import { Role } from '../domain/user.entity';  // se Role só é usado como tipo
```

### 3. Sem `any`

```typescript
// ✓ produção — interface explícita
interface HttpExceptionBody {
  message?: string;
  details?: unknown[];
}
const body = (typeof raw === 'string' ? { message: raw } : raw) as HttpExceptionBody;

// ✓ testes — cast via unknown
const mock = { execute: jest.fn() } as unknown as FindUserByEmailUseCase;

// ✗ errado
const body = exception.getResponse() as any;
const mock = { execute: jest.fn() } as any;
```

### 4. Typed generics nos helpers NestJS

```typescript
// ✓ correto
const req = context.switchToHttp().getRequest<Request>();
const res = context.switchToHttp().getResponse<Response>();
const response = ctx.getResponse<Response>();

// ✗ errado — retorna any
const req = context.switchToHttp().getRequest();
```

### 5. Floating promises

```typescript
// ✓ correto — uso em top-level (main.ts)
void bootstrap();

// ✓ correto — dentro de async
await app.listen(port);

// ✗ errado
bootstrap();  // floating promise
```

### 6. Decorators com return type

```typescript
// ✓ correto
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: string[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);

// ✗ errado
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 7. Observable no canActivate

```typescript
import type { Observable } from 'rxjs';

canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
  ...
}
```

---

## Comandos

```bash
pnpm lint          # checar erros
pnpm lint:fix      # corrigir auto-fixáveis (consistent-type-imports, unused-imports, etc.)
pnpm format        # formatar todos os arquivos
pnpm format:check  # checar sem alterar
```

---

## O que o `lint:fix` resolve automaticamente

- `consistent-type-imports` — converte `import { Foo }` para `import type { Foo }` quando necessário
- `unused-imports/no-unused-imports` — remove imports não usados
- Formatação Prettier (via `format`)

## O que precisa fix manual

- Return types faltando em funções
- `any` implícito ou explícito em código de produção
- Floating promises
