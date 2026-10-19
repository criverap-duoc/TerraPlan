import { Role } from './role.enum';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: Role;
  typ: 'access' | 'refresh';
  jti?: string;
  exp?: number;
}
