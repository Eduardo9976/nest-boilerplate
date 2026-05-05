# Environment Strategy

## Why Zod

`class-validator` and `joi` validate at runtime but don't produce TypeScript types. You end up with `process.env.SOME_VAR as string` scattered across the codebase. Zod gives you:

1. **Fail-fast validation** — app exits on startup if env is invalid, with a clear error message showing exactly which variable is wrong.
2. **Typed config** — `z.infer<typeof EnvSchema>` is the source of truth. `ConfigService.get('PORT')` returns `number`, not `string | undefined`.
3. **Conditional validation** — `superRefine()` lets you express "GOOGLE_CLIENT_ID is required only when ENABLE_GOOGLE_AUTH=true" as code, not documentation.

## How validation works

1. `ConfigModule.forRoot({ validate: validateEnv })` calls `validateEnv(process.env)` at bootstrap.
2. `validateEnv` calls `EnvSchema.safeParse(config)`.
3. If parsing fails, the error message lists every failing variable with its path and message, then throws — NestJS exits before the app starts.
4. If parsing succeeds, the typed `Env` object is returned and stored in `ConfigService`.

## Using config in code

```typescript
constructor(private readonly configService: ConfigService) {}

// Returns typed value
const port = this.configService.get<number>('PORT'); // number
const secret = this.configService.get<string>('JWT_ACCESS_SECRET'); // string
```

## Feature flags

`ENABLE_JWT_AUTH` and `ENABLE_GOOGLE_AUTH` are boolean flags parsed by Zod's `.transform()`.

- `ENABLE_GOOGLE_AUTH=false` (default): `GoogleAuthController` and `GoogleStrategy` are not instantiated. No Google routes appear in the router or Swagger.
- `ENABLE_GOOGLE_AUTH=true`: Google OAuth routes are registered and `GoogleStrategy` is active. The three `GOOGLE_*` variables become required and fail-fast if missing.
