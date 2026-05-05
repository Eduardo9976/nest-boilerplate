import type { User } from '../user.entity';

export interface CreateUserData {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  role: 'USER' | 'ADMIN';
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
