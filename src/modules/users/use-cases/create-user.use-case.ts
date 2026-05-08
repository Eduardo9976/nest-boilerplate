import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRepository, USER_REPOSITORY } from '../domain/user.repository';
import type { User } from '../domain/user.entity';
import { ConflictException } from '../../../shared/exceptions/conflict.exception';

export interface CreateUserInput {
  email: string;
  password?: string;
  googleId?: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.repo.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;

    return this.repo.create({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      googleId: input.googleId ?? null,
      role: 'USER',
    });
  }
}
