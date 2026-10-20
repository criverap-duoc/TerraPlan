export type Role = 'admin' | 'coordinator' | 'field_technician' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  tokenType: string;
}
