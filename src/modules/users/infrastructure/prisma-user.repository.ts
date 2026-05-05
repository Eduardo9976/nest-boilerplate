import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateUserData, IUserRepository } from '../domain/repositories/user.repository.interface';
import { User } from '../domain/user.entity';
import { Email } from '../domain/value-objects/email.vo';
import { Password } from '../domain/value-objects/password.vo';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({
      where: { email },
    });
    return r ? this.toDomain(r) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({ where: { googleId } });
    return r ? this.toDomain(r) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const r = await this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        password: data.passwordHash,
        googleId: data.googleId,
        role: data.role,
      },
    });
    return this.toDomain(r);
  }

  private toDomain(r: {
    id: string;
    email: string;
    password: string | null;
    googleId: string | null;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.create({
      id: r.id,
      email: Email.create(r.email),
      password: r.password ? Password.fromHash(r.password) : null,
      googleId: r.googleId,
      role: r.role,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }
}
