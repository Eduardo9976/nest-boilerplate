import { Module } from '@nestjs/common';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email.use-case';
import { ValidatePasswordUseCase } from './application/use-cases/validate-password.use-case';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { UsersController } from './presentation/users.controller';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

@Module({
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    FindUserByEmailUseCase,
    ValidatePasswordUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [CreateUserUseCase, FindUserByEmailUseCase, ValidatePasswordUseCase],
})
export class UsersModule {}
