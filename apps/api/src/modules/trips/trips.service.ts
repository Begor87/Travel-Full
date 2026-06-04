import { prisma, Prisma } from '../../database/prisma.js';
import { NotFoundError, AuthorizationError } from '../../shared/errors/AppError.js';
import type { CreateTripInput, UpdateTripInput } from '@wanderlog/shared';

type TripAccessLevel = 'read' | 'write' | 'owner';

export async function assertTripAccess(
  tripId: string,
  userId: string,
  level: TripAccessLevel = 'read',
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      collaborators: { where: { userId } },
    },
  });

  if (!trip) throw new NotFoundError('Trip');

  const isOwner = trip.ownerId === userId;
  const collaborator = trip.collaborators[0];
  const isPublic = trip.visibility === 'PUBLIC';

  if (level === 'read') {
    if (!isOwner && !collaborator && !isPublic) {
      throw new AuthorizationError();
    }
    return trip;
  }

  if (level === 'write') {
    if (!isOwner && collaborator?.role !== 'EDITOR') {
      throw new AuthorizationError('You do not have edit access to this trip');
    }
    return trip;
  }

  if (level === 'owner') {
    if (!isOwner) {
      throw new AuthorizationError('Only the trip owner can perform this action');
    }
    return trip;
  }

  return trip;
}

export async function listTrips(userId: string, status?: string) {
  return prisma.trip.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
      ...(status && { status: status.toUpperCase() as never }),
    },
    include: {
      destinations: { orderBy: { order: 'asc' } },
      _count: { select: { collaborators: true } },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getTripById(tripId: string, userId: string) {
  const trip = await assertTripAccess(tripId, userId);

  return prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destinations: { orderBy: { order: 'asc' } },
      collaborators: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { days: true, documents: true, expenses: true },
      },
    },
  });
}

export async function createTrip(userId: string, input: CreateTripInput) {
  return prisma.trip.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category.toUpperCase() as never,
      tags: input.tags ?? [],
      visibility: (input.visibility ?? 'private').toUpperCase() as never,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      timezone: input.timezone,
      ownerId: userId,
      destinations: {
        create: input.destinations.map((d) => ({
          name: d.name,
          country: d.country,
          countryCode: d.countryCode.toUpperCase(),
          latitude: d.latitude,
          longitude: d.longitude,
          placeId: d.placeId,
          order: d.order,
        })),
      },
    },
    include: {
      destinations: { orderBy: { order: 'asc' } },
    },
  });
}

export async function updateTrip(tripId: string, userId: string, input: UpdateTripInput) {
  await assertTripAccess(tripId, userId, 'write');

  const { destinations, ...rest } = input;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (destinations) {
      await tx.tripDestination.deleteMany({ where: { tripId } });
      await tx.tripDestination.createMany({
        data: destinations.map((d) => ({
          tripId,
          name: d.name,
          country: d.country,
          countryCode: d.countryCode.toUpperCase(),
          latitude: d.latitude,
          longitude: d.longitude,
          placeId: d.placeId,
          order: d.order,
        })),
      });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: {
        ...(rest.title && { title: rest.title }),
        ...(rest.description !== undefined && { description: rest.description }),
        ...(rest.timezone && { timezone: rest.timezone }),
        ...(rest.coverImageUrl !== undefined && { coverImageUrl: rest.coverImageUrl }),
        ...(rest.tags && { tags: rest.tags }),
        ...(rest.status && { status: rest.status.toUpperCase() as Prisma.EnumTripStatusFieldUpdateOperationsInput['set'] }),
        ...(rest.category && { category: rest.category.toUpperCase() as Prisma.EnumTripCategoryFieldUpdateOperationsInput['set'] }),
        ...(rest.visibility && { visibility: rest.visibility.toUpperCase() as Prisma.EnumVisibilityFieldUpdateOperationsInput['set'] }),
        ...(rest.startDate && { startDate: new Date(rest.startDate) }),
        ...(rest.endDate && { endDate: new Date(rest.endDate) }),
      },
      include: {
        destinations: { orderBy: { order: 'asc' } },
      },
    });
  });
}

export async function deleteTrip(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId, 'owner');
  await prisma.trip.delete({ where: { id: tripId } });
}

export async function duplicateTrip(tripId: string, userId: string) {
  const source = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destinations: true,
      days: {
        include: {
          events: {
            include: { bookingRefs: true, checklistItems: true },
          },
        },
      },
    },
  });

  if (!source) throw new NotFoundError('Trip');

  return prisma.trip.create({
    data: {
      title: `${source.title} (Copy)`,
      description: source.description,
      category: source.category,
      tags: source.tags,
      visibility: 'PRIVATE' as never,
      startDate: source.startDate,
      endDate: source.endDate,
      timezone: source.timezone,
      ownerId: userId,
      destinations: {
        create: source.destinations.map((dest) => {
          const { id: _id, tripId: _tid, ...d } = dest as { id: string; tripId: string; name: string; country: string; countryCode: string; latitude: number | null; longitude: number | null; placeId: string | null; order: number };
          return d;
        }),
      },
    },
    include: { destinations: true },
  });
}
