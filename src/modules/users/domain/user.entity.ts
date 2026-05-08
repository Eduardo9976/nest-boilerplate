export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
