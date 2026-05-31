import type { UserRole } from '@shared/types/jwt.types';

export interface RegisterDto {
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  phone: string;
  email: string;
  dob: string;
  role: UserRole;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface GoogleLoginDto {
  token: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface ActivateAccountQuery {
  email: string;
  code: string;
}
