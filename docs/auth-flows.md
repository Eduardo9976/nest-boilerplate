# Auth Flows

## JWT Login

```
Client                    Server
  |                          |
  | POST /auth/login         |
  |  { email, password }     |
  |------------------------->|
  |                          | ZodValidationPipe validates body
  |                          | JwtLoginUseCase.execute()
  |                          |   → FindUserByEmailUseCase → IUserRepository
  |                          |   → ValidatePasswordUseCase → bcrypt.compare
  |                          |   → JwtService.sign({ sub: userId }) → accessToken
  |                          |   → crypto.randomUUID() → tokenId
  |                          |   → JwtService.sign({ sub: userId, tokenId }) → refreshToken
  |                          |   → RedisTokenRepository.store(userId, tokenId, TTL)
  |<-------------------------|
  | 200 { accessToken, refreshToken }
```

## Token Refresh

```
Client                    Server
  |                          |
  | POST /auth/refresh       |
  |  Authorization: Bearer <refreshToken>
  |------------------------->|
  |                          | JwtRefreshStrategy validates JWT signature + expiry
  |                          | payload → { userId, tokenId }
  |                          | RefreshTokenUseCase.execute(userId, tokenId)
  |                          |   → RedisTokenRepository.verify() → 401 if missing
  |                          |   → RedisTokenRepository.delete(userId, tokenId)
  |                          |   → JwtLoginUseCase.issueTokenPair(userId)
  |<-------------------------|
  | 200 { accessToken, refreshToken } (new pair)
```

Old refresh token is immediately invalidated — replay attacks are rejected.

## Google OAuth

```
Client                    Server                  Google
  |                          |                        |
  | GET /auth/google         |                        |
  |------------------------->|                        |
  |                          | GoogleStrategy builds redirect URL
  |<-------------------------|                        |
  | 302 → accounts.google.com                        |
  |----------------------------------------------->  |
  |                          |  Google redirects back |
  |                          |<-----------------------|
  |                          | GET /auth/google/callback?code=...
  |                          | GoogleStrategy exchanges code for profile
  |                          | GoogleLoginUseCase.execute({ googleId, email })
  |                          |   → FindUserByEmailUseCase
  |                          |       found → return existing user
  |                          |       not found → CreateUserUseCase (password: null)
  |                          |   → JwtLoginUseCase.issueTokenPair(userId)
  |<-------------------------|
  | 200 { accessToken, refreshToken }
```

## Logout

```
Client                    Server
  |                          |
  | POST /auth/logout        |
  |  Authorization: Bearer <accessToken>
  |------------------------->|
  |                          | JwtAuthGuard validates access token
  |                          | RedisTokenRepository.deleteAll(userId)
  |                          |   → deletes all refresh:userId:* keys
  |<-------------------------|
  | 204 No Content
```

All refresh tokens for the user are revoked. Any pending refresh attempts will receive 401.
