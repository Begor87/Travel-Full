import { prisma, Prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from '../../shared/errors/AppError.js';
import { INVITATION_EXPIRY_DAYS } from '@wanderlog/shared';

export async function getCollaborators(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  return prisma.tripCollaborator.findMany({
    where: { tripId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });
}

export async function inviteCollaborator(
  tripId: string,
  inviterId: string,
  email: string,
  role: 'EDITOR' | 'VIEWER',
) {
  await assertTripAccess(tripId, inviterId, 'owner');

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new NotFoundError('Trip');

  // Check if user already has access
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existing = await prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId, userId: existingUser.id } },
    });
    if (existing) throw new ConflictError('This user is already a collaborator');
  }

  // Revoke any pending invitation for this email
  await prisma.tripInvitation.updateMany({
    where: { tripId, email, status: 'PENDING' },
    data: { status: 'EXPIRED' },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  return prisma.tripInvitation.create({
    data: { tripId, email, role, invitedById: inviterId, expiresAt },
  });
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.tripInvitation.findUnique({ where: { token } });

  if (!invitation) throw new NotFoundError('Invitation');
  if (invitation.status !== 'PENDING') {
    throw new ConflictError(`Invitation is ${invitation.status.toLowerCase()}`);
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new ConflictError('Invitation has expired');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  if (user.email !== invitation.email) {
    throw new AuthorizationError('This invitation was sent to a different email address');
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return tx.tripCollaborator.upsert({
      where: { tripId_userId: { tripId: invitation.tripId, userId } },
      create: { tripId: invitation.tripId, userId, role: invitation.role },
      update: { role: invitation.role },
    });
  });
}

export async function removeCollaborator(
  tripId: string,
  requesterId: string,
  targetUserId: string,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new NotFoundError('Trip');

  const isOwner = trip.ownerId === requesterId;
  const isSelf = requesterId === targetUserId;

  if (!isOwner && !isSelf) {
    throw new AuthorizationError('Only the trip owner can remove collaborators');
  }

  if (targetUserId === trip.ownerId) {
    throw new AuthorizationError('Cannot remove the trip owner');
  }

  await prisma.tripCollaborator.delete({
    where: { tripId_userId: { tripId, userId: targetUserId } },
  });
}

export async function updateCollaboratorRole(
  tripId: string,
  ownerId: string,
  targetUserId: string,
  role: 'EDITOR' | 'VIEWER',
) {
  await assertTripAccess(tripId, ownerId, 'owner');

  return prisma.tripCollaborator.update({
    where: { tripId_userId: { tripId, userId: targetUserId } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
}

export async function getActivityLog(tripId: string, userId: string, page = 1) {
  await assertTripAccess(tripId, userId);

  const perPage = 50;
  return prisma.activityLog.findMany({
    where: { tripId },
    include: {
      user: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage,
    take: perPage,
  });
}

export async function recordActivity(
  tripId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityTitle?: string,
  metadata?: Record<string, unknown>,
) {
  return prisma.activityLog.create({
    data: {
      tripId,
      userId,
      action: action.toUpperCase() as never,
      entityType: entityType.toUpperCase() as never,
      entityId,
      entityTitle,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
