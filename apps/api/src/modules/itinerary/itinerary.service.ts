import { prisma, Prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateEventInput, UpdateEventInput, ScheduleConflict } from '@wanderlog/shared';

/**
 * Parses an event datetime as a "wall-clock at destination" value.
 *
 * Event times are floating local times, not instants. If the incoming string
 * carries no timezone designator (e.g. "2026-09-10T08:00" from a datetime-local
 * input), we treat it as UTC so the stored value matches what the user typed,
 * independent of the server's timezone. Strings that already carry an offset or
 * Z are respected as-is.
 */
function parseEventDateTime(value: string): Date {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

/**
 * Maps a Prisma event (flat location columns, `bookingRefs` relation) into the
 * shape the API exposes and the frontend expects: a nested `location` object
 * and a `bookingReferences` array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeEvent(event: any) {
  const { locationName, locationAddress, locationLat, locationLng, locationPlaceId, bookingRefs, ...rest } = event;
  return {
    ...rest,
    location: locationName
      ? {
          name: locationName,
          address: locationAddress ?? undefined,
          latitude: locationLat ?? undefined,
          longitude: locationLng ?? undefined,
          placeId: locationPlaceId ?? undefined,
        }
      : undefined,
    bookingReferences: bookingRefs ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDay(day: any) {
  return { ...day, events: (day.events ?? []).map(serializeEvent) };
}

export async function getTripItinerary(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  const days = await prisma.itineraryDay.findMany({
    where: { tripId },
    include: {
      events: {
        orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
        include: {
          bookingRefs: true,
          checklistItems: { orderBy: { order: 'asc' } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  return days.map(serializeDay);
}

export async function getDayById(dayId: string) {
  return prisma.itineraryDay.findUnique({
    where: { id: dayId },
    include: {
      events: {
        orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
        include: { bookingRefs: true, checklistItems: true },
      },
    },
  });
}

export async function ensureDayExists(tripId: string, date: string) {
  return prisma.itineraryDay.upsert({
    where: { tripId_date: { tripId, date: new Date(date) } },
    create: { tripId, date: new Date(date) },
    update: {},
  });
}

export async function createEvent(
  tripId: string,
  dayId: string,
  userId: string,
  input: CreateEventInput,
) {
  await assertTripAccess(tripId, userId, 'write');

  const day = await prisma.itineraryDay.findUnique({ where: { id: dayId } });
  if (!day || day.tripId !== tripId) throw new NotFoundError('Itinerary day');

  const event = await prisma.itineraryEvent.create({
    data: {
      tripId,
      dayId,
      title: input.title,
      description: input.description,
      category: input.category.toUpperCase() as never,
      status: (input.status ?? 'confirmed').toUpperCase() as never,
      startTime: input.startTime ? parseEventDateTime(input.startTime) : undefined,
      endTime: input.endTime ? parseEventDateTime(input.endTime) : undefined,
      allDay: input.allDay ?? false,
      duration: input.duration,
      locationName: input.location?.name,
      locationAddress: input.location?.address,
      locationLat: input.location?.latitude,
      locationLng: input.location?.longitude,
      locationPlaceId: input.location?.placeId,
      notes: input.notes,
      cost: input.cost,
      costCurrency: input.costCurrency,
      reminderMinutes: input.reminderMinutes,
      order: input.order ?? 0,
      bookingRefs: {
        create: (input.bookingReferences ?? []).map((b) => ({
          provider: b.provider,
          reference: b.reference,
          url: b.url,
        })),
      },
      checklistItems: {
        create: (input.checklistItems ?? []).map((c, i) => ({
          text: c.text,
          checked: c.checked,
          order: i,
        })),
      },
    },
    include: { bookingRefs: true, checklistItems: true },
  });

  return serializeEvent(event);
}

export async function updateEvent(
  eventId: string,
  tripId: string,
  userId: string,
  input: UpdateEventInput,
) {
  await assertTripAccess(tripId, userId, 'write');

  const event = await prisma.itineraryEvent.findUnique({ where: { id: eventId } });
  if (!event || event.tripId !== tripId) throw new NotFoundError('Event');

  const { bookingReferences, checklistItems, location, ...rest } = input;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (bookingReferences !== undefined) {
      await tx.bookingReference.deleteMany({ where: { eventId } });
      await tx.bookingReference.createMany({
        data: bookingReferences.map((b) => ({
          eventId,
          provider: b.provider,
          reference: b.reference,
          url: b.url,
        })),
      });
    }

    if (checklistItems !== undefined) {
      await tx.checklistItem.deleteMany({ where: { eventId } });
      await tx.checklistItem.createMany({
        data: checklistItems.map((c, i) => ({
          eventId,
          text: c.text,
          checked: c.checked,
          order: i,
        })),
      });
    }

    return tx.itineraryEvent.update({
      where: { id: eventId },
      data: {
        ...(rest.title && { title: rest.title }),
        ...(rest.description !== undefined && { description: rest.description }),
        ...(rest.allDay !== undefined && { allDay: rest.allDay }),
        ...(rest.duration !== undefined && { duration: rest.duration }),
        ...(rest.notes !== undefined && { notes: rest.notes }),
        ...(rest.cost !== undefined && { cost: rest.cost }),
        ...(rest.costCurrency !== undefined && { costCurrency: rest.costCurrency }),
        ...(rest.reminderMinutes !== undefined && { reminderMinutes: rest.reminderMinutes }),
        ...(rest.order !== undefined && { order: rest.order }),
        ...(rest.category && { category: rest.category.toUpperCase() as Prisma.EnumEventCategoryFieldUpdateOperationsInput['set'] }),
        ...(rest.status && { status: rest.status.toUpperCase() as Prisma.EnumEventStatusFieldUpdateOperationsInput['set'] }),
        ...(rest.startTime && { startTime: parseEventDateTime(rest.startTime) }),
        ...(rest.endTime && { endTime: parseEventDateTime(rest.endTime) }),
        ...(location !== undefined && {
          locationName: location?.name,
          locationAddress: location?.address,
          locationLat: location?.latitude,
          locationLng: location?.longitude,
          locationPlaceId: location?.placeId,
        }),
      },
      include: { bookingRefs: true, checklistItems: true },
    });
  }).then(serializeEvent);
}

export async function deleteEvent(eventId: string, tripId: string, userId: string) {
  await assertTripAccess(tripId, userId, 'write');
  const event = await prisma.itineraryEvent.findUnique({ where: { id: eventId } });
  if (!event || event.tripId !== tripId) throw new NotFoundError('Event');
  await prisma.itineraryEvent.delete({ where: { id: eventId } });
}

export async function reorderEvents(
  dayId: string,
  tripId: string,
  userId: string,
  orderedIds: string[],
) {
  await assertTripAccess(tripId, userId, 'write');

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.itineraryEvent.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
}

export async function detectConflicts(tripId: string): Promise<ScheduleConflict[]> {
  const events = await prisma.itineraryEvent.findMany({
    where: {
      tripId,
      startTime: { not: null },
      status: { not: 'CANCELLED' },
    },
    orderBy: { startTime: 'asc' },
  });

  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      if (!a.startTime || !a.endTime || !b.startTime) continue;

      const aEnd = a.endTime.getTime();
      const bStart = b.startTime.getTime();

      // Overlap: event A hasn't ended when B starts
      if (aEnd > bStart) {
        conflicts.push({
          eventA: a.id,
          eventB: b.id,
          type: 'overlap',
          severity: 'error',
          message: `"${a.title}" and "${b.title}" overlap in time`,
        });
      }

      // Tight transfer: less than 30 minutes between events in different locations
      const gap = bStart - aEnd;
      if (
        gap >= 0 &&
        gap < 30 * 60 * 1000 &&
        a.locationPlaceId &&
        b.locationPlaceId &&
        a.locationPlaceId !== b.locationPlaceId
      ) {
        conflicts.push({
          eventA: a.id,
          eventB: b.id,
          type: 'tight_transfer',
          severity: 'warning',
          message: `Only ${Math.round(gap / 60000)} minutes between "${a.title}" and "${b.title}" at different locations`,
        });
      }
    }
  }

  return conflicts;
}
