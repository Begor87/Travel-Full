import { prisma, Prisma } from '../../database/prisma.js';
import { NotFoundError, ConflictError } from '../../shared/errors/AppError.js';

export async function getUpcomingEvents(userId: string) {
  const now = new Date();
  const in90days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  return prisma.itineraryEvent.findMany({
    where: {
      startTime: { gte: now, lte: in90days },
      status: { not: 'CANCELLED' },
      day: {
        trip: {
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
          ],
        },
      },
    },
    include: {
      day: {
        include: {
          trip: { select: { id: true, title: true, status: true } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
    take: 100,
  });
}

export async function getAllCollaborators(userId: string) {
  // Unique people across all trips the user is part of
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      collaborators: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });

  // Deduplicate by userId, attach which trips each person is on
  const peopleMap = new Map<string, {
    user: { id: string; name: string; email: string | null; avatarUrl: string | null };
    trips: { id: string; title: string }[];
    role: string;
  }>();

  for (const trip of trips) {
    for (const collab of trip.collaborators) {
      if (collab.userId === userId) continue; // exclude self
      if (!peopleMap.has(collab.userId)) {
        peopleMap.set(collab.userId, {
          user: collab.user,
          trips: [],
          role: collab.role,
        });
      }
      peopleMap.get(collab.userId)!.trips.push({ id: trip.id, title: trip.title });
    }
  }

  return Array.from(peopleMap.values());
}

export async function getAllDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    include: {
      trip: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllTripBudgets(userId: string) {
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      status: true,
      destinations: { select: { name: true }, orderBy: { order: 'asc' }, take: 1 },
      budget: true,
      _count: { select: { expenses: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  // Attach total spent per trip
  const results = await Promise.all(
    trips.map(async (trip) => {
      const agg = await prisma.expense.aggregate({
        where: { tripId: trip.id },
        _sum: { amount: true },
      });
      return { ...trip, totalSpent: agg._sum.amount ?? 0 };
    }),
  );

  return results;
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
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
  data: { name?: string; avatarUrl?: string | null; email?: string },
) {
  // Email: '' clears it (set null); a value must be unique to this user.
  let email: string | null | undefined;
  if (data.email !== undefined) {
    email = data.email.trim() || null;
    if (email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictError('That email is already in use');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(email !== undefined && { email }),
    },
    select: {
      id: true,
      username: true,
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
