# Protecting Routes

## Default: all routes are protected

`JwtAuthGuard` is registered as `APP_GUARD` in `app.module.ts`. Every route requires a valid Bearer JWT unless explicitly opted out.

## Opt out a single route with `@Public()`

```typescript
@Public()
@Post('login')
login(@Body(...) dto: LoginDto) { ... }
```

## Opt out an entire controller

```typescript
@Public()
@Controller('health')
export class HealthController { ... }
```

## Protect a specific controller when guard is global

No action needed — it's already protected. To be explicit:
```typescript
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController { ... }
```

## How the JWT guard works

1. Checks `@Public()` metadata via `Reflector`. If set, returns `true` immediately.
2. Otherwise delegates to `AuthGuard('jwt')` which calls `JwtStrategy.validate()`.
3. `JwtStrategy` reads `Authorization: Bearer <token>`, verifies signature and expiry against `JWT_ACCESS_SECRET`.
4. On success, attaches `{ userId }` to `req.user`.
5. On failure, throws `UnauthorizedException` (HTTP 401).

## Accessing the authenticated user in a controller

```typescript
@Get('me')
getMe(@Request() req: { user: { userId: string } }) {
  return req.user;
}
```

## Role-based access (scaffolded, not enforced globally)

```typescript
@Roles('ADMIN')
@Get('admin-only')
adminRoute() { ... }
```

Add a `RolesGuard` to the `APP_GUARD` array in `app.module.ts` when you need enforcement.
