import { Inject, Injectable } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/user.entity';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserRepository) {}

  execute(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }
}
