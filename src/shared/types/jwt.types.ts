export type UserRole = 'customer' | 'admin' | 'seller';

export interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
