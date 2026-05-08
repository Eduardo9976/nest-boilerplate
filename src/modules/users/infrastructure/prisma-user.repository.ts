import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { UserRepository } from '../domain/user.repository';
import type { User, Role } from '../domain/user.entity';

type PrismaUser = {
  id: string;
  email: string;
  password: string | null;
  googleId: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({ where: { id } });
    return r ? this.toEntity(r) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({ where: { email } });
    return r ? this.toEntity(r) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const r = await this.prisma.user.findUnique({ where: { googleId } });
    return r ? this.toEntity(r) : null;
  }

  async create(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const r = await this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        password: data.passwordHash,
        googleId: data.googleId,
        role: data.role,
      },
    });
    return this.toEntity(r);
  }

  private toEntity(r: PrismaUser): User {
    const { password, role, ...rest } = r;
    return { ...rest, passwordHash: password, role: role as Role };
  }
}
