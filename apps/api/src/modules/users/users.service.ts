import { prisma, Prisma } from '../../database/prisma.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          ownedTrips: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      preferences: true,
      updatedAt: true,
    },
  });
}

export async function updateUserPreferences(
  userId: string,
  preferences: Record<string, unknown>,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) throw new NotFoundError('User');

  const merged = { ...(user.preferences as Record<string, unknown>), ...preferences };

  return prisma.user.update({
    where: { id: userId },
    data: { preferences: merged as Prisma.InputJsonValue },
    select: { id: true, preferences: true, updatedAt: true },
  });
}
