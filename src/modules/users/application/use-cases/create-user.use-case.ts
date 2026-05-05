import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  CreateUserData,
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/user.entity';
import { ConflictException } from '../../../../shared/exceptions/conflict.exception';

export interface CreateUserInput {
  email: string;
  password?: string;
  googleId?: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const normalized = input.email.toLowerCase().trim();
    const existing = await this.repo.findByEmail(normalized);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;

    const data: CreateUserData = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash,
      googleId: input.googleId ?? null,
      role: 'USER',
    };

    return this.repo.create(data);
  }
}
