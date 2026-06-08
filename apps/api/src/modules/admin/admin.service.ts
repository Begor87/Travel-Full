import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';

const SALT_ROUNDS = 12;
const READABLE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += READABLE_ALPHABET[Math.floor(Math.random() * READABLE_ALPHABET.length)];
  }
  return out;
}

/** Revokes every active refresh token for a user — forces re-login everywhere. */
async function revokeAllSessions(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { ownedTrips: true, refreshTokens: { where: { revokedAt: null } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateUser(
  targetId: string,
  adminId: string,
  data: { role?: 'USER' | 'ADMIN'; isActive?: boolean },
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError('User');

  // Guard against an admin locking themselves out
  if (targetId === adminId) {
    if (data.role === 'USER') throw new ValidationError('You cannot remove your own admin role');
    if (data.isActive === false) throw new ValidationError('You cannot block your own account');
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(data.role && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  // Blocking a user immediately ends their sessions so they can't keep using
  // an existing refresh token.
  if (data.isActive === false) {
    await revokeAllSessions(targetId);
  }

  return updated;
}

/** Resets a user's password to a freshly generated temporary one, which is
 *  returned to the admin (plaintext, once) to hand over. Ends their sessions. */
export async function resetPassword(targetId: string) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError('User');

  const tempPassword = `${randomCode(4)}-${randomCode(4)}`; // e.g. "K7PQ-M3XY"
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  await prisma.user.update({ where: { id: targetId }, data: { passwordHash } });
  await revokeAllSessions(targetId);

  return { tempPassword };
}

export async function deleteUser(targetId: string, adminId: string) {
  if (targetId === adminId) throw new ValidationError('You cannot delete your own account here');
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError('User');
  await prisma.user.delete({ where: { id: targetId } });
}

// ─── Signup access code ──────────────────────────────────────────────────────

const SIGNUP_CODE_KEY = 'signup_access_code';

export async function getSignupCode(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: SIGNUP_CODE_KEY } });
  return row?.value ?? null;
}

export async function regenerateSignupCode(): Promise<string> {
  const code = randomCode(8);
  await prisma.appSetting.upsert({
    where: { key: SIGNUP_CODE_KEY },
    create: { key: SIGNUP_CODE_KEY, value: code },
    update: { value: code },
  });
  return code;
}

/** Validates a submitted signup code against the stored one. Used by register. */
export async function isValidSignupCode(submitted: string): Promise<boolean> {
  const current = await getSignupCode();
  // If no code is set, registration is effectively closed.
  if (!current) return false;
  return submitted.trim().toUpperCase() === current.toUpperCase();
}
