import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@wanderlog.app' },
    update: {},
    create: {
      email: 'demo@wanderlog.app',
      name: 'Alex Demo',
      passwordHash,
      isVerified: true,
      preferences: {
        theme: 'system',
        currency: 'USD',
        locale: 'en',
        timezone: 'Europe/London',
        distanceUnit: 'km',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        weekStartsOn: 1,
        defaultTripVisibility: 'private',
      },
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create a sample trip
  const trip = await prisma.trip.upsert({
    where: { id: 'seed-trip-japan-2025' },
    update: {},
    create: {
      id: 'seed-trip-japan-2025',
      title: 'Japan Explorer 2025',
      description: 'Two weeks discovering Tokyo, Kyoto, and Osaka',
      status: 'PLANNING',
      category: 'CULTURAL',
      tags: ['asia', 'culture', 'food', 'temples'],
      visibility: 'PRIVATE',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-15'),
      timezone: 'Asia/Tokyo',
      ownerId: user.id,
      destinations: {
        create: [
          { name: 'Tokyo', country: 'Japan', countryCode: 'JP', order: 0 },
          { name: 'Kyoto', country: 'Japan', countryCode: 'JP', order: 1 },
          { name: 'Osaka', country: 'Japan', countryCode: 'JP', order: 2 },
        ],
      },
    },
  });

  console.log(`Created trip: ${trip.title}`);

  // Create itinerary days
  const day1 = await prisma.itineraryDay.upsert({
    where: { tripId_date: { tripId: trip.id, date: new Date('2025-10-01') } },
    update: {},
    create: {
      tripId: trip.id,
      date: new Date('2025-10-01'),
      title: 'Arrival Day',
    },
  });

  await prisma.itineraryEvent.upsert({
    where: { id: 'seed-event-flight-tokyo' },
    update: {},
    create: {
      id: 'seed-event-flight-tokyo',
      tripId: trip.id,
      dayId: day1.id,
      title: 'Flight to Tokyo (Narita)',
      category: 'FLIGHT',
      status: 'CONFIRMED',
      startTime: new Date('2025-10-01T10:00:00Z'),
      endTime: new Date('2025-10-01T22:00:00Z'),
      locationName: 'Narita International Airport',
      order: 0,
      bookingRefs: {
        create: [{ provider: 'JL', reference: 'JL001234' }],
      },
    },
  });

  // Create a budget
  await prisma.budget.upsert({
    where: { tripId: trip.id },
    update: {},
    create: {
      tripId: trip.id,
      totalAmount: 4000,
      currency: 'USD',
      categories: [
        { category: 'accommodation', allocatedAmount: 1500, spentAmount: 0 },
        { category: 'food', allocatedAmount: 800, spentAmount: 0 },
        { category: 'transport', allocatedAmount: 600, spentAmount: 0 },
        { category: 'activities', allocatedAmount: 700, spentAmount: 0 },
        { category: 'other', allocatedAmount: 400, spentAmount: 0 },
      ],
    },
  });

  console.log('Seed complete!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email:    demo@wanderlog.app');
  console.log('  Password: Demo1234!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
