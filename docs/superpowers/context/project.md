# Project Context — poc-nest

## O que é

Boilerplate NestJS enterprise, production-ready, usado como base para múltiplos times. Totalmente implementado.

## Tech Stack

| Tecnologia | Versão | Papel |
|---|---|---|
| NestJS | v11 | Framework |
| TypeScript | 5.7 | Linguagem |
| Zod | v4 | Validação de entrada e env |
| Prisma | v7 | ORM + migrations |
| PostgreSQL | 16 | Banco de dados |
| Redis | 7 | Storage de refresh tokens |
| Passport.js | — | JWT + Google OAuth |
| pnpm | 10 | Package manager |
| Jest | 29 | Testes unit + e2e |
| supertest | 7 | HTTP testing |
| ESLint | 10 | Linting (flat config) |
| Prettier | 3 | Formatação |

## Estado atual

- Implementação completa: todos os módulos, testes unit, testes e2e
- ESLint 10 + typescript-eslint strict configurados, **0 erros**
- Prettier configurado, **todos os arquivos formatados**

## Comandos principais

```bash
pnpm start:dev           # dev server
pnpm build               # build prod
pnpm test                # unit tests
pnpm test:e2e            # e2e tests (precisa de Postgres + Redis rodando)
pnpm test:cov            # cobertura
pnpm lint                # ESLint
pnpm lint:fix            # ESLint com auto-fix
pnpm format              # Prettier write
pnpm format:check        # Prettier check
pnpm prisma:migrate      # prisma migrate dev
pnpm prisma:generate     # regenera o client
pnpm prisma:studio       # UI do banco
```

## Infraestrutura local

```bash
docker-compose up -d     # sobe Postgres:5432 + Redis:6379
```

**Banco de teste:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pocnest_test" pnpm prisma migrate deploy
```

## Variáveis de ambiente

Arquivo `.env` (desenvolvimento) e `.env.test` (testes). Validado via Zod ao bootar — app não sobe se env inválido.

```
PORT                    (default 3000)
NODE_ENV                development | production | test
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET       (mínimo 32 chars)
JWT_ACCESS_EXPIRES_IN   (default 15m)
JWT_REFRESH_SECRET      (mínimo 32 chars)
JWT_REFRESH_EXPIRES_IN  (default 7d)
ENABLE_JWT_AUTH         (default true)
ENABLE_GOOGLE_AUTH      (default false)
GOOGLE_CLIENT_ID        (obrigatório se ENABLE_GOOGLE_AUTH=true)
GOOGLE_CLIENT_SECRET    (obrigatório se ENABLE_GOOGLE_AUTH=true)
GOOGLE_CALLBACK_URL     (obrigatório se ENABLE_GOOGLE_AUTH=true)
```

## Rotas disponíveis

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /users | público | cria usuário |
| POST | /auth/login | público | login JWT |
| POST | /auth/refresh | jwt-refresh | renova tokens |
| POST | /auth/logout | jwt | revoga todas as sessões |
| GET | /auth/google | público | inicia OAuth Google |
| GET | /auth/google/callback | público | callback OAuth Google |
| GET | /api/docs | — | Swagger (non-production) |

## Swagger

Habilitado apenas quando `NODE_ENV !== 'production'`. URL: `/api/docs`.
