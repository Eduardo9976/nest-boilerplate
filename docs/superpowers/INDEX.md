# Superpowers Docs — poc-nest

Arquivos de contexto e regras para uso em prompts futuros.  
Referenciar no início de uma nova sessão para situar o agente rapidamente.

---

## Context (O QUE é o projeto)

| Arquivo | Quando usar |
|---|---|
| [context/project.md](context/project.md) | Tech stack, comandos, rotas, estado atual, env vars |
| [context/architecture.md](context/architecture.md) | Padrão arquitetural, regras de layer, decisões de design |

## Rules (COMO escrever código)

| Arquivo | Quando usar |
|---|---|
| [rules/nestjs-patterns.md](rules/nestjs-patterns.md) | Criar módulo, use case, controller, DTO, repository, decorator |
| [rules/testing-patterns.md](rules/testing-patterns.md) | Escrever spec files, mockar dependências, TDD flow, e2e |
| [rules/typescript-linting.md](rules/typescript-linting.md) | Return types, `import type`, `any`, floating promises, ESLint/Prettier |
| [rules/error-handling.md](rules/error-handling.md) | Exceções de domínio, ZodValidationPipe, GlobalExceptionFilter |

## Plans & Specs

| Arquivo | Descrição |
|---|---|
| [specs/2026-04-30-nestjs-boilerplate-design.md](specs/2026-04-30-nestjs-boilerplate-design.md) | Design spec completo (auth flows, data model, decisões) |
| [plans/2026-04-30-nestjs-boilerplate.md](plans/2026-04-30-nestjs-boilerplate.md) | Implementation plan com todos os arquivos e steps |

---

## Quick reference para novos prompts

Para adicionar uma nova feature ao projeto, incluir no prompt:

```
Contexto do projeto: @docs/superpowers/context/project.md
Arquitetura: @docs/superpowers/context/architecture.md
Padrões de código: @docs/superpowers/rules/nestjs-patterns.md
Testes: @docs/superpowers/rules/testing-patterns.md
```
