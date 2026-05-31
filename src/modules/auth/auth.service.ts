import jwt from 'jsonwebtoken';
import { UserRepository } from '@modules/users/users.repository';
import { cacheService } from '@infrastructure/cache/cache.service';
import { sendMail } from '@infrastructure/mailer/mailer';
import { env } from '@shared/config/env';
import { createModuleLogger } from '@shared/logger/createModuleLogger';
import { OAuth2Client } from 'google-auth-library';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} from '@shared/errors/AppError';
import type { JwtPayload, TokenPair, UserRole } from '@shared/types/jwt.types';
import type { RegisterDto, LoginDto, GoogleLoginDto } from './auth.types';
import type { IUser } from '@modules/users/users.types';
import { buildActivationEmail } from './auth.email';

const log = createModuleLogger('auth.service');
const userRepository = new UserRepository();
const googleAuthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const signAccess = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions);

const signRefresh = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);

export const generateTokenPair = (user: Pick<IUser, '_id' | 'username' | 'role'>): TokenPair => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    id: String(user._id),
    username: user.username,
    role: user.role as UserRole,
  };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload) };
};

export const registerUser = async (dto: RegisterDto): Promise<void> => {
  log.info({ username: dto.username, email: dto.email }, 'Registering new user');

  const existing = await userRepository.findByIdentifier(dto.username, dto.email, dto.phone);
  if (existing) {
    const field =
      existing.username === dto.username ? 'Username'
      : existing.email === dto.email ? 'Email'
      : 'Phone number';
    log.warn({ username: dto.username, email: dto.email, field }, 'Registration conflict');
    throw new ConflictError(`${field} already exists`);
  }

  const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const activationLink = `${env.BACKEND_URL}/api/users/activate?email=${encodeURIComponent(dto.email)}&code=${confirmationCode}`;

  await userRepository.create({
    username: dto.username,
    first_name: dto.first_name,
    last_name: dto.last_name,
    password_hash: dto.password,
    phone: dto.phone,
    email: dto.email,
    DOB: new Date(dto.dob),
    role: dto.role,
    status: 'active',
    isConfirmed: false,
    confirmationCode,
    expireConfirmationCode: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  void sendMail({
    to: dto.email,
    subject: 'Confirm Your Email - XBensieve Registration',
    html: buildActivationEmail(confirmationCode, activationLink),
  });

  log.info({ email: dto.email }, 'User registered — confirmation email queued');
};

export const loginUser = async (dto: LoginDto): Promise<TokenPair> => {
  log.info({ username: dto.username }, 'Login attempt');

  const user = await userRepository.findByUsername(dto.username);
  if (!user) {
    log.warn({ username: dto.username }, 'Login failed — user not found');
    throw new UnauthorizedError('Invalid username or password');
  }

  const isMatch = await user.comparePassword(dto.password);
  if (!isMatch) {
    log.warn({ username: dto.username }, 'Login failed — wrong password');
    throw new UnauthorizedError('Invalid username or password');
  }

  if (!user.isConfirmed) {
    log.warn({ username: dto.username }, 'Login failed — email not confirmed');
    throw new UnauthorizedError('Please confirm your email first');
  }

  log.info({ userId: String(user._id), username: user.username }, 'Login successful');
  return generateTokenPair(user);
};

export const loginWithGoogle = async (dto: GoogleLoginDto): Promise<TokenPair> => {
  log.info('Google OAuth login attempt');

  let ticket;
  try {
    ticket = await googleAuthClient.verifyIdToken({ idToken: dto.token, audience: env.GOOGLE_CLIENT_ID });
  } catch (err) {
    log.error({ err }, 'Google token verification failed');
    throw new UnauthorizedError('Invalid Google token');
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    log.warn('Google token had no email payload');
    throw new UnauthorizedError('Invalid Google token');
  }

  let user = await userRepository.findByEmail(payload.email);
  if (!user) {
    log.info({ email: payload.email }, 'Creating new user from Google OAuth');
    user = await userRepository.create({
      username: payload.email,
      first_name: payload.given_name ?? '',
      last_name: payload.family_name ?? '',
      password_hash: null,
      email: payload.email,
      role: 'customer',
      status: 'active',
      isConfirmed: true,
      avatar: payload.picture ?? null,
    });
  }

  log.info({ userId: String(user._id), email: payload.email }, 'Google OAuth login successful');
  return generateTokenPair(user);
};

export const activateAccount = async (email: string, code: string): Promise<void> => {
  log.info({ email }, 'Account activation attempt');

  const user = await userRepository.findByEmailAndCode(email, code);
  if (!user) {
    log.warn({ email }, 'Activation failed — invalid code or email');
    throw new BadRequestError('Invalid or expired activation link');
  }
  if (user.isConfirmed) {
    log.warn({ email }, 'Activation failed — already confirmed');
    throw new BadRequestError('Account already activated');
  }
  if (user.expireConfirmationCode && user.expireConfirmationCode < new Date()) {
    log.warn({ email }, 'Activation failed — code expired');
    throw new BadRequestError('Activation code has expired');
  }

  await userRepository.activateUser(String(user._id));
  log.info({ email, userId: String(user._id) }, 'Account activated successfully');
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const isBlacklisted = await cacheService.exists(`blacklist:refresh:${refreshToken}`);
  if (isBlacklisted) {
    log.warn('Refresh token is blacklisted');
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch (err) {
    log.warn({ err }, 'Refresh token verification failed');
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const ttl = (decoded.exp ?? 0) - Math.floor(Date.now() / 1000);
  if (ttl > 0) await cacheService.set(`blacklist:refresh:${refreshToken}`, true, ttl);

  log.info({ userId: decoded.id }, 'Access token refreshed');
  return signAccess({ id: decoded.id, username: decoded.username, role: decoded.role });
};

export const logoutUser = async (accessToken: string, refreshToken?: string): Promise<void> => {
  const decoded = jwt.decode(accessToken) as JwtPayload | null;
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await cacheService.blacklistToken(accessToken, ttl);
  }
  if (refreshToken) await cacheService.set(`blacklist:refresh:${refreshToken}`, true, 7 * 24 * 60 * 60);
  log.info({ userId: decoded?.id }, 'User logged out — tokens blacklisted');
};
