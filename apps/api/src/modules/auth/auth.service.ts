import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../database/prisma.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import type { RegisterInput, LoginInput, AuthTokens } from '@wanderlog/shared';

const SALT_ROUNDS = 12;

function signAccessToken(userId: string, role: string): string {
  const options: SignOptions = { expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET!, options);
}

function signRefreshToken(userId: string): string {
  const options: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRY ?? '30d') as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, options);
}

function getRefreshExpiry(): Date {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRY ?? '30') || 30;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      preferences: {
        theme: 'system',
        currency: 'USD',
        locale: 'en',
        timezone: 'UTC',
        distanceUnit: 'km',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        weekStartsOn: 1,
        defaultTripVisibility: 'private',
      },
    },
  });

  return issueTokens(user.id, user.role);
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash) {
    throw new AuthenticationError('Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  return issueTokens(user.id, user.role);
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as typeof payload;
  } catch {
    throw new AuthenticationError('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new AuthenticationError('Invalid token type');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AuthenticationError('Refresh token is no longer valid');
  }

  // Rotate the refresh token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(stored.user.id, stored.user.role);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });
}

async function issueTokens(userId: string, role: string): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: getRefreshExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
  };
}
