import type { Email } from './value-objects/email.vo';
import type { Password } from './value-objects/password.vo';

export type Role = 'USER' | 'ADMIN';

export interface UserProps {
  id: string;
  email: Email;
  password: Password | null;
  googleId: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get password(): Password | null {
    return this.props.password;
  }
  get googleId(): string | null {
    return this.props.googleId;
  }
  get role(): Role {
    return this.props.role;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
