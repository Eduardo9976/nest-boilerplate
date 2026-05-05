# NestJS Enterprise Boilerplate

Production-ready NestJS boilerplate with Clean Architecture, JWT + Google OAuth, Prisma/PostgreSQL, Redis, and Zod validation.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env and set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (min 32 chars)

# 4. Run database migration and generate Prisma client
pnpm prisma:migrate
pnpm prisma:generate

# 5. Start development server
pnpm start:dev
```

Swagger UI: http://localhost:3000/api/docs

## Testing

```bash
# Unit tests
pnpm test

# Unit tests in watch mode
pnpm test:watch

# E2E tests (requires Docker services running)
# Create test DB first:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pocnest_test" pnpm exec prisma migrate deploy
pnpm test:e2e

# Coverage
pnpm test:cov
```

## Environment Variables

See `.env.example` for all variables and their defaults.

Key feature flags:
- `ENABLE_JWT_AUTH=true` — enables email/password login (default: on)
- `ENABLE_GOOGLE_AUTH=false` — enables Google OAuth (default: off); requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

## Documentation

| Topic | File |
|---|---|
| Request lifecycle | `docs/request-flow.md` |
| Adding a new module | `docs/new-module-guide.md` |
| Protecting routes | `docs/protecting-routes.md` |
| Auth flows (JWT + Google) | `docs/auth-flows.md` |
| Environment strategy | `docs/env-strategy.md` |
| Architectural decisions | `docs/design-decisions.md` |
| Design spec | `docs/superpowers/specs/2026-04-30-nestjs-boilerplate-design.md` |

## Architecture

```
src/
├── config/          # Env validation (Zod), typed ConfigModule
├── shared/          # Cross-cutting: pipes, filters, interceptors, guards, decorators, exceptions
├── infrastructure/  # Prisma + Redis modules (global providers)
└── modules/
    ├── users/       # Domain entity, value objects, use cases, Prisma repo, controller
    └── auth/        # JWT/Google strategies, login/refresh/logout use cases, controllers
```

Each module is fully self-contained with `domain/` → `application/` → `infrastructure/` → `presentation/` layers. Domain never imports from NestJS or Prisma.
