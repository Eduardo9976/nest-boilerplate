import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/auth.controller';
import { GoogleAuthController } from './presentation/google-auth.controller';
import { JwtLoginUseCase } from './application/jwt-login.use-case';
import { RefreshTokenUseCase } from './application/refresh-token.use-case';
import { GoogleLoginUseCase } from './application/google-login.use-case';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtRefreshStrategy } from './infrastructure/strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import {
  RedisTokenRepository,
  REDIS_TOKEN_REPOSITORY,
} from './infrastructure/redis-token.repository';

// Evaluated at module load time — dotenv is loaded first in main.ts
const ENABLE_GOOGLE = process.env.ENABLE_GOOGLE_AUTH === 'true';

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: ENABLE_GOOGLE ? [AuthController, GoogleAuthController] : [AuthController],
  providers: [
    JwtLoginUseCase,
    RefreshTokenUseCase,
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: REDIS_TOKEN_REPOSITORY, useClass: RedisTokenRepository },
    ...(ENABLE_GOOGLE ? [GoogleStrategy, GoogleLoginUseCase] : []),
  ],
})
export class AuthModule {}
