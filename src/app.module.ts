import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {AppConfigModule} from './config/config.module';
import {PrismaModule} from './infrastructure/prisma/prisma.module';
import {RedisModule} from './infrastructure/redis/redis.module';
import {UsersModule} from './modules/users/users.module';
import {AuthModule} from './modules/auth/auth.module';
import {JwtAuthGuard} from './shared/guards/jwt-auth.guard';
import {ServicesModule} from "./modules/services/services.module";

@Module({
    imports: [AppConfigModule, PrismaModule, RedisModule, UsersModule, AuthModule, ServicesModule],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {
}
