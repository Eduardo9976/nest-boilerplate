import { Injectable } from '@nestjs/common';
import type { User as PrismaUserRecord } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { UserRepository } from '../domain/user.repository';
import type { User, Role } from '../domain/user.entity';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toEntity(record) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { googleId } });
    return record ? this.toEntity(record) : null;
  }

  async create(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        password: data.passwordHash,
        googleId: data.googleId,
        role: data.role,
      },
    });
    return this.toEntity(record);
  }

  private toEntity(record: PrismaUserRecord): User {
    const { password, role, ...rest } = record;
    return { ...rest, passwordHash: password, role: role as Role };
  }
}
