import { Inject, Injectable } from '@nestjs/common';
import { UserRepository, USER_REPOSITORY } from '../domain/user.repository';
import type { User } from '../domain/user.entity';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  execute(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }
}
