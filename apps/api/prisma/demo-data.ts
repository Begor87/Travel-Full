import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dt(dateStr: string, timeStr?: string): Date {
  return new Date(`${dateStr}T${timeStr ?? '00:00:00'}Z`);
}

async function main() {
  console.log('Adding demo trips...\n');

  // ── Fetch / create users ───────────────────────────────────────────────────

  const alex = await prisma.user.findUniqueOrThrow({ where: { email: 'demo@wanderlog.app' } });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@wanderlog.app' },
    update: {},
    create: {
      username: 'sarah',
      email: 'sarah@wanderlog.app',
      name: 'Sarah Wilson',
      passwordHash: await bcrypt.hash('Demo1234!', 12),
      isVerified: true,
      preferences: {
        theme: 'system', currency: 'NOK', locale: 'en',
        timezone: 'Europe/Oslo', distanceUnit: 'km',
        dateFormat: 'DD.MM.YYYY', timeFormat: '24h',
        weekStartsOn: 1, defaultTripVisibility: 'private',
      },
    },
  });

  console.log(`Users: ${alex.name}, ${sarah.name}`);

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP 1 — Paris Long Weekend (COMPLETED, Jan 2026)
  // ══════════════════════════════════════════════════════════════════════════

  const paris = await prisma.trip.upsert({
    where: { id: 'demo-paris-jan-2026' },
    update: {},
    create: {
      id: 'demo-paris-jan-2026',
      title: 'Paris Long Weekend',
      description: 'A wonderful long weekend exploring the City of Light — art, food, and culture.',
      status: 'COMPLETED',
      category: 'LEISURE',
      tags: ['europe', 'art', 'food', 'culture', 'city-break'],
      visibility: 'PRIVATE',
      startDate: dt('2026-01-15'),
      endDate: dt('2026-01-18'),
      timezone: 'Europe/Paris',
      ownerId: alex.id,
      destinations: {
        create: [{ name: 'Paris', country: 'France', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522, order: 0 }],
      },
    },
  });

  // Collaborator
  await prisma.tripCollaborator.upsert({
    where: { tripId_userId: { tripId: paris.id, userId: sarah.id } },
    update: {},
    create: { tripId: paris.id, userId: sarah.id, role: 'EDITOR' },
  });

  // Budget
  await prisma.budget.upsert({
    where: { tripId: paris.id },
    update: {},
    create: {
      tripId: paris.id,
      totalAmount: 1200,
      currency: 'EUR',
      categories: [
        { category: 'accommodation', allocatedAmount: 400, spentAmount: 380 },
        { category: 'food', allocatedAmount: 300, spentAmount: 290 },
        { category: 'transport', allocatedAmount: 250, spentAmount: 210 },
        { category: 'activities', allocatedAmount: 200, spentAmount: 195 },
        { category: 'other', allocatedAmount: 50, spentAmount: 42 },
      ],
    },
  });

  // Days & Events
  const p1 = await upsertDay(paris.id, '2026-01-15', 'Arrival Day');
  await upsertEvent(paris.id, p1.id, { id: 'p-e1', title: 'Flight LHR → CDG', category: 'FLIGHT', status: 'CONFIRMED', startTime: dt('2026-01-15', '07:30:00'), endTime: dt('2026-01-15', '10:00:00'), locationName: 'Heathrow Airport', order: 0, bookingRef: { provider: 'BA', reference: 'BA327' } });
  await upsertEvent(paris.id, p1.id, { id: 'p-e2', title: 'Check-in — Hôtel Le Marais', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-01-15', '14:00:00'), locationName: '13 Rue des Archives, Le Marais', order: 1 });
  await upsertEvent(paris.id, p1.id, { id: 'p-e3', title: 'Dinner at Chez Janou', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-01-15', '19:30:00'), endTime: dt('2026-01-15', '21:30:00'), locationName: '2 Rue Roger Verlomme, 75003', notes: 'Provençal bistro — book ahead. Try the tapenade.', order: 2 });

  const p2 = await upsertDay(paris.id, '2026-01-16', 'Museums & Culture');
  await upsertEvent(paris.id, p2.id, { id: 'p-e4', title: 'Breakfast at Café de Flore', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-01-16', '09:00:00'), endTime: dt('2026-01-16', '10:00:00'), locationName: '172 Blvd Saint-Germain', order: 0 });
  await upsertEvent(paris.id, p2.id, { id: 'p-e5', title: 'Louvre Museum', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-01-16', '10:30:00'), endTime: dt('2026-01-16', '14:00:00'), locationName: 'Rue de Rivoli, 75001 Paris', notes: 'Pre-booked timed entry. Focus on Denon Wing — Mona Lisa, Winged Victory.', order: 1, bookingRef: { provider: 'Louvre', reference: 'LVR-98234' } });
  await upsertEvent(paris.id, p2.id, { id: 'p-e6', title: 'Lunch at Angelina', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-01-16', '14:15:00'), endTime: dt('2026-01-16', '15:30:00'), locationName: '226 Rue de Rivoli', notes: 'Famous for hot chocolate. Try the Mont-Blanc dessert.', order: 2 });
  await upsertEvent(paris.id, p2.id, { id: 'p-e7', title: 'Seine River Cruise', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2026-01-16', '16:00:00'), endTime: dt('2026-01-16', '17:00:00'), locationName: 'Pont de l\'Alma', order: 3, bookingRef: { provider: 'Bateaux Parisiens', reference: 'BP-4421' } });
  await upsertEvent(paris.id, p2.id, { id: 'p-e8', title: 'Dinner at Le Comptoir du Relais', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-01-16', '20:00:00'), endTime: dt('2026-01-16', '22:00:00'), locationName: '9 Carrefour de l\'Odéon', order: 4 });

  const p3 = await upsertDay(paris.id, '2026-01-17', 'Eiffel Tower & Versailles');
  await upsertEvent(paris.id, p3.id, { id: 'p-e9', title: 'Eiffel Tower — Summit', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-01-17', '09:00:00'), endTime: dt('2026-01-17', '11:30:00'), locationName: 'Champ de Mars, 75007 Paris', order: 0, bookingRef: { provider: 'Eiffel Tower', reference: 'ET-2026-556' } });
  await upsertEvent(paris.id, p3.id, { id: 'p-e10', title: 'RER C to Versailles', category: 'TRAIN', status: 'CONFIRMED', startTime: dt('2026-01-17', '12:00:00'), endTime: dt('2026-01-17', '12:45:00'), locationName: 'Gare du Champ de Mars', order: 1 });
  await upsertEvent(paris.id, p3.id, { id: 'p-e11', title: 'Palace of Versailles', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-01-17', '13:00:00'), endTime: dt('2026-01-17', '17:00:00'), locationName: 'Place d\'Armes, 78000 Versailles', order: 2, bookingRef: { provider: 'Château de Versailles', reference: 'VRS-8819' } });
  await upsertEvent(paris.id, p3.id, { id: 'p-e12', title: 'Farewell Dinner at Bistrot Paul Bert', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-01-17', '19:30:00'), endTime: dt('2026-01-17', '22:00:00'), locationName: '18 Rue Paul Bert, 75011', notes: 'Classic Parisian bistro. Steak frites essential.', order: 3 });

  const p4 = await upsertDay(paris.id, '2026-01-18', 'Departure');
  await upsertEvent(paris.id, p4.id, { id: 'p-e13', title: 'Hotel Check-out', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-01-18', '11:00:00'), locationName: 'Hôtel Le Marais', order: 0 });
  await upsertEvent(paris.id, p4.id, { id: 'p-e14', title: 'Shopping — Galeries Lafayette', category: 'FREE_TIME', status: 'CONFIRMED', startTime: dt('2026-01-18', '11:30:00'), endTime: dt('2026-01-18', '13:30:00'), locationName: '40 Blvd Haussmann', order: 1 });
  await upsertEvent(paris.id, p4.id, { id: 'p-e15', title: 'Flight CDG → LHR', category: 'FLIGHT', status: 'CONFIRMED', startTime: dt('2026-01-18', '17:30:00'), endTime: dt('2026-01-18', '18:00:00'), locationName: 'Charles de Gaulle Airport', order: 2, bookingRef: { provider: 'BA', reference: 'BA332' } });

  // Expenses (Paris - completed trip, all logged)
  const parisExpenses = [
    { id: 'pe-1', title: 'Return flights (2 people)', amount: 380, category: 'TRANSPORT', date: '2026-01-15' },
    { id: 'pe-2', title: 'Hôtel Le Marais (3 nights)', amount: 380, category: 'ACCOMMODATION', date: '2026-01-15' },
    { id: 'pe-3', title: 'Louvre tickets', amount: 34, category: 'ACTIVITIES', date: '2026-01-16' },
    { id: 'pe-4', title: 'Seine cruise tickets', amount: 28, category: 'ACTIVITIES', date: '2026-01-16' },
    { id: 'pe-5', title: 'Versailles entrance', amount: 33, category: 'ACTIVITIES', date: '2026-01-17' },
    { id: 'pe-6', title: 'Eiffel Tower tickets', amount: 50, category: 'ACTIVITIES', date: '2026-01-17' },
    { id: 'pe-7', title: 'Restaurant bills (4 days)', amount: 290, category: 'FOOD', date: '2026-01-16' },
    { id: 'pe-8', title: 'Metro & RER passes', amount: 42, category: 'TRANSPORT', date: '2026-01-15' },
    { id: 'pe-9', title: 'Souvenirs & shopping', amount: 80, category: 'OTHER', date: '2026-01-18' },
  ];
  for (const e of parisExpenses) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: {},
      create: { id: e.id, tripId: paris.id, title: e.title, amount: e.amount, currency: 'EUR', category: e.category as never, paidById: alex.id, date: dt(e.date) },
    });
  }

  console.log('✓ Paris Long Weekend — COMPLETED');

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP 2 — Italy: Rome, Florence & Amalfi (ACTIVE, Jun–Jul 2026)
  // ══════════════════════════════════════════════════════════════════════════

  const italy = await prisma.trip.upsert({
    where: { id: 'demo-italy-jun-2026' },
    update: {},
    create: {
      id: 'demo-italy-jun-2026',
      title: 'Italian Grand Tour',
      description: 'Two weeks through Italy — ancient Rome, Renaissance Florence, and the breathtaking Amalfi Coast.',
      status: 'ACTIVE',
      category: 'LEISURE',
      tags: ['europe', 'italy', 'history', 'food', 'coast', 'culture'],
      visibility: 'PRIVATE',
      startDate: dt('2026-06-01'),
      endDate: dt('2026-06-14'),
      timezone: 'Europe/Rome',
      ownerId: alex.id,
      destinations: {
        create: [
          { name: 'Rome', country: 'Italy', countryCode: 'IT', latitude: 41.9028, longitude: 12.4964, order: 0 },
          { name: 'Florence', country: 'Italy', countryCode: 'IT', latitude: 43.7696, longitude: 11.2558, order: 1 },
          { name: 'Amalfi Coast', country: 'Italy', countryCode: 'IT', latitude: 40.6340, longitude: 14.6027, order: 2 },
        ],
      },
    },
  });

  await prisma.tripCollaborator.upsert({
    where: { tripId_userId: { tripId: italy.id, userId: sarah.id } },
    update: {},
    create: { tripId: italy.id, userId: sarah.id, role: 'EDITOR' },
  });

  await prisma.budget.upsert({
    where: { tripId: italy.id },
    update: {},
    create: {
      tripId: italy.id,
      totalAmount: 3500,
      currency: 'EUR',
      categories: [
        { category: 'accommodation', allocatedAmount: 1200, spentAmount: 820 },
        { category: 'food', allocatedAmount: 700, spentAmount: 310 },
        { category: 'transport', allocatedAmount: 600, spentAmount: 420 },
        { category: 'activities', allocatedAmount: 500, spentAmount: 185 },
        { category: 'other', allocatedAmount: 500, spentAmount: 65 },
      ],
    },
  });

  // Rome days (Jun 1–5)
  const r1 = await upsertDay(italy.id, '2026-06-01', 'Arrival — Rome');
  await upsertEvent(italy.id, r1.id, { id: 'i-e1', title: 'Flight to Rome Fiumicino', category: 'FLIGHT', status: 'CONFIRMED', startTime: dt('2026-06-01', '06:15:00'), endTime: dt('2026-06-01', '10:20:00'), locationName: 'London Gatwick', order: 0, bookingRef: { provider: 'Ryanair', reference: 'FR2241' } });
  await upsertEvent(italy.id, r1.id, { id: 'i-e2', title: 'Leonardo Express to Termini', category: 'TRAIN', status: 'CONFIRMED', startTime: dt('2026-06-01', '11:00:00'), endTime: dt('2026-06-01', '11:35:00'), locationName: 'Fiumicino Airport Station', order: 1 });
  await upsertEvent(italy.id, r1.id, { id: 'i-e3', title: 'Check-in — Hotel Artemide', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-06-01', '14:00:00'), locationName: 'Via Nazionale 22, Rome', order: 2, bookingRef: { provider: 'Booking.com', reference: 'BK-7723991' } });
  await upsertEvent(italy.id, r1.id, { id: 'i-e4', title: 'Evening walk — Trevi Fountain & Pantheon', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-01', '18:00:00'), endTime: dt('2026-06-01', '20:30:00'), locationName: 'Trevi Fountain, Rome', order: 3 });

  const r2 = await upsertDay(italy.id, '2026-06-02', 'Ancient Rome');
  await upsertEvent(italy.id, r2.id, { id: 'i-e5', title: 'Colosseum & Roman Forum', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-02', '09:00:00'), endTime: dt('2026-06-02', '13:00:00'), locationName: 'Piazza del Colosseo, Rome', order: 0, bookingRef: { provider: 'Colosseum', reference: 'COL-2026-8811' }, notes: 'Skip-the-line tickets. Enter from Via Sacra gate.' });
  await upsertEvent(italy.id, r2.id, { id: 'i-e6', title: 'Lunch at Osteria del Pegno', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-06-02', '13:30:00'), endTime: dt('2026-06-02', '15:00:00'), locationName: 'Vicolo di Montevecchio 8', order: 1 });
  await upsertEvent(italy.id, r2.id, { id: 'i-e7', title: 'Vatican Museums & Sistine Chapel', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-02', '15:30:00'), endTime: dt('2026-06-02', '19:00:00'), locationName: 'Viale Vaticano, Vatican City', order: 2, bookingRef: { provider: 'Vatican Museums', reference: 'VAT-56612' } });

  const r3 = await upsertDay(italy.id, '2026-06-03', 'Rome — Free Day');
  await upsertEvent(italy.id, r3.id, { id: 'i-e8', title: 'Borghese Gallery', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-03', '09:00:00'), endTime: dt('2026-06-03', '11:00:00'), locationName: 'Piazzale Scipione Borghese 5', order: 0, bookingRef: { provider: 'Borghese Gallery', reference: 'BG-3309' }, notes: 'Timed entry, max 2hrs. Bernini sculptures unmissable.' });
  await upsertEvent(italy.id, r3.id, { id: 'i-e9', title: 'Spanish Steps & Piazza Navona', category: 'FREE_TIME', status: 'CONFIRMED', startTime: dt('2026-06-03', '12:00:00'), endTime: dt('2026-06-03', '15:00:00'), locationName: 'Piazza di Spagna', order: 1 });
  await upsertEvent(italy.id, r3.id, { id: 'i-e10', title: 'Food tour — Testaccio Market', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2026-06-03', '16:00:00'), endTime: dt('2026-06-03', '19:00:00'), locationName: 'Via Beniamino Franklin, Testaccio', order: 2, bookingRef: { provider: 'Eating Italy', reference: 'EI-4492' } });

  // Florence (Jun 5–9)
  const f1 = await upsertDay(italy.id, '2026-06-05', 'Travel to Florence');
  await upsertEvent(italy.id, f1.id, { id: 'i-e11', title: 'Frecciarossa — Rome to Florence', category: 'TRAIN', status: 'CONFIRMED', startTime: dt('2026-06-05', '10:00:00'), endTime: dt('2026-06-05', '11:35:00'), locationName: 'Roma Termini', order: 0, bookingRef: { provider: 'Trenitalia', reference: 'IT-FR9622' } });
  await upsertEvent(italy.id, f1.id, { id: 'i-e12', title: 'Check-in — AdAstra Florence', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-06-05', '14:00:00'), locationName: 'Via Tornabuoni 1, Florence', order: 1, bookingRef: { provider: 'Hotels.com', reference: 'HC-99021' } });
  await upsertEvent(italy.id, f1.id, { id: 'i-e13', title: 'Uffizi Gallery', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-05', '15:00:00'), endTime: dt('2026-06-05', '18:30:00'), locationName: 'Piazzale degli Uffizi, Florence', order: 2, bookingRef: { provider: 'Uffizi', reference: 'UFZ-7731' } });

  const f2 = await upsertDay(italy.id, '2026-06-06', 'Renaissance Florence');
  await upsertEvent(italy.id, f2.id, { id: 'i-e14', title: 'Accademia Gallery — David', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-06', '09:00:00'), endTime: dt('2026-06-06', '11:00:00'), locationName: 'Via Ricasoli 58-60, Florence', order: 0, bookingRef: { provider: 'Accademia', reference: 'ACC-2244' } });
  await upsertEvent(italy.id, f2.id, { id: 'i-e15', title: 'Duomo & Brunelleschi\'s Dome Climb', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2026-06-06', '11:30:00'), endTime: dt('2026-06-06', '14:00:00'), locationName: 'Piazza del Duomo, Florence', order: 1, notes: '463 steps — wear comfortable shoes.' });
  await upsertEvent(italy.id, f2.id, { id: 'i-e16', title: 'Cooking Class — Fresh Pasta', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2026-06-06', '17:00:00'), endTime: dt('2026-06-06', '20:30:00'), locationName: 'Oltrarno district, Florence', order: 2, bookingRef: { provider: 'Florencetown', reference: 'FT-5512' } });

  // Amalfi (Jun 10–14)
  const a1 = await upsertDay(italy.id, '2026-06-10', 'Travel to Amalfi Coast');
  await upsertEvent(italy.id, a1.id, { id: 'i-e17', title: 'Train Florence → Naples', category: 'TRAIN', status: 'CONFIRMED', startTime: dt('2026-06-10', '09:00:00'), endTime: dt('2026-06-10', '11:30:00'), locationName: 'Firenze S.M.N.', order: 0, bookingRef: { provider: 'Trenitalia', reference: 'IT-FR1101' } });
  await upsertEvent(italy.id, a1.id, { id: 'i-e18', title: 'Ferry Naples → Positano', category: 'FERRY', status: 'CONFIRMED', startTime: dt('2026-06-10', '13:15:00'), endTime: dt('2026-06-10', '14:45:00'), locationName: 'Molo Beverello, Naples', order: 1, bookingRef: { provider: 'NLG Ferries', reference: 'NLG-3388' } });
  await upsertEvent(italy.id, a1.id, { id: 'i-e19', title: 'Check-in — Le Sirenuse', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-06-10', '15:00:00'), locationName: 'Via Cristoforo Colombo 30, Positano', order: 2, bookingRef: { provider: 'Le Sirenuse', reference: 'LS-2026-981' } });

  const a2 = await upsertDay(italy.id, '2026-06-11', 'Positano & Praiano');
  await upsertEvent(italy.id, a2.id, { id: 'i-e20', title: 'Sentiero degli Dei (Path of the Gods)', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2026-06-11', '07:30:00'), endTime: dt('2026-06-11', '12:00:00'), locationName: 'Agerola trailhead', notes: 'Start early to avoid heat. Bring water and sunscreen.', order: 0 });
  await upsertEvent(italy.id, a2.id, { id: 'i-e21', title: 'Beach afternoon — Spiaggia Grande', category: 'FREE_TIME', status: 'CONFIRMED', startTime: dt('2026-06-11', '14:00:00'), endTime: dt('2026-06-11', '18:00:00'), locationName: 'Spiaggia Grande, Positano', order: 1 });
  await upsertEvent(italy.id, a2.id, { id: 'i-e22', title: 'Sunset dinner at La Tagliata', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2026-06-11', '19:30:00'), endTime: dt('2026-06-11', '22:00:00'), locationName: 'Via Tagliata, Positano', notes: 'Hillside restaurant. Stunning sea views. Sharing menu.', order: 2 });

  // Italy expenses (partially logged — trip is active)
  const italyExpenses = [
    { id: 'ie-1', title: 'Ryanair flights × 2', amount: 280, category: 'TRANSPORT', date: '2026-06-01' },
    { id: 'ie-2', title: 'Hotel Artemide (4 nights)', amount: 440, category: 'ACCOMMODATION', date: '2026-06-01' },
    { id: 'ie-3', title: 'Leonardo Express tickets', amount: 28, category: 'TRANSPORT', date: '2026-06-01' },
    { id: 'ie-4', title: 'Colosseum tickets', amount: 48, category: 'ACTIVITIES', date: '2026-06-02' },
    { id: 'ie-5', title: 'Vatican Museums tickets', amount: 40, category: 'ACTIVITIES', date: '2026-06-02' },
    { id: 'ie-6', title: 'Borghese Gallery', amount: 27, category: 'ACTIVITIES', date: '2026-06-03' },
    { id: 'ie-7', title: 'Eating Italy food tour', amount: 70, category: 'ACTIVITIES', date: '2026-06-03' },
    { id: 'ie-8', title: 'Meals in Rome (3 days)', amount: 185, category: 'FOOD', date: '2026-06-02' },
    { id: 'ie-9', title: 'Trenitalia Rome–Florence', amount: 60, category: 'TRANSPORT', date: '2026-06-05' },
    { id: 'ie-10', title: 'Uffizi Gallery tickets', amount: 30, category: 'ACTIVITIES', date: '2026-06-05' },
  ];
  for (const e of italyExpenses) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: {},
      create: { id: e.id, tripId: italy.id, title: e.title, amount: e.amount, currency: 'EUR', category: e.category as never, paidById: alex.id, date: dt(e.date) },
    });
  }

  console.log('✓ Italian Grand Tour — ACTIVE');

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP 3 — New York City (PLANNING, Sep 2026)
  // ══════════════════════════════════════════════════════════════════════════

  const nyc = await prisma.trip.upsert({
    where: { id: 'demo-nyc-sep-2026' },
    update: {},
    create: {
      id: 'demo-nyc-sep-2026',
      title: 'New York City — Fall 2026',
      description: 'First time in New York — Brooklyn, Manhattan, Central Park, and everything in between.',
      status: 'PLANNING',
      category: 'ADVENTURE',
      tags: ['usa', 'nyc', 'city', 'first-time', 'culture', 'food'],
      visibility: 'PRIVATE',
      startDate: dt('2026-09-10'),
      endDate: dt('2026-09-17'),
      timezone: 'America/New_York',
      ownerId: alex.id,
      destinations: {
        create: [
          { name: 'New York City', country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.0060, order: 0 },
        ],
      },
    },
  });

  await prisma.budget.upsert({
    where: { tripId: nyc.id },
    update: {},
    create: {
      tripId: nyc.id,
      totalAmount: 5000,
      currency: 'USD',
      categories: [
        { category: 'accommodation', allocatedAmount: 1800, spentAmount: 0 },
        { category: 'food', allocatedAmount: 800, spentAmount: 0 },
        { category: 'transport', allocatedAmount: 700, spentAmount: 0 },
        { category: 'activities', allocatedAmount: 900, spentAmount: 0 },
        { category: 'shopping', allocatedAmount: 500, spentAmount: 0 },
        { category: 'other', allocatedAmount: 300, spentAmount: 0 },
      ],
    },
  });

  // Day 1 — Arrival
  const n1 = await upsertDay(nyc.id, '2026-09-10', 'Arrival — Manhattan');
  await upsertEvent(nyc.id, n1.id, { id: 'n-e1', title: 'Flight LHR → JFK', category: 'FLIGHT', status: 'CONFIRMED', startTime: dt('2026-09-10', '09:30:00'), endTime: dt('2026-09-10', '12:45:00'), locationName: 'Heathrow Terminal 3', order: 0, bookingRef: { provider: 'Virgin Atlantic', reference: 'VS003' } });
  await upsertEvent(nyc.id, n1.id, { id: 'n-e2', title: 'JFK AirTrain + Subway to Manhattan', category: 'TRAIN', status: 'CONFIRMED', startTime: dt('2026-09-10', '14:00:00'), endTime: dt('2026-09-10', '15:15:00'), locationName: 'JFK International Airport', order: 1, notes: 'Take AirTrain to Jamaica, then E train to Midtown. ~$10 total.' });
  await upsertEvent(nyc.id, n1.id, { id: 'n-e3', title: 'Check-in — The High Line Hotel', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2026-09-10', '16:00:00'), locationName: '180 Tenth Avenue, Chelsea', order: 2, bookingRef: { provider: 'Hotels.com', reference: 'HC-481992' } });
  await upsertEvent(nyc.id, n1.id, { id: 'n-e4', title: 'First walk — The High Line', category: 'FREE_TIME', status: 'TENTATIVE', startTime: dt('2026-09-10', '17:30:00'), endTime: dt('2026-09-10', '19:30:00'), locationName: 'The High Line, Chelsea', order: 3 });

  // Day 2 — Brooklyn
  const n2 = await upsertDay(nyc.id, '2026-09-11', 'Brooklyn Day');
  await upsertEvent(nyc.id, n2.id, { id: 'n-e5', title: 'Brooklyn Bridge Walk', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-11', '08:30:00'), endTime: dt('2026-09-11', '10:00:00'), locationName: 'Brooklyn Bridge, NYC', notes: 'Walk from Manhattan side. Best in morning for photos.', order: 0 });
  await upsertEvent(nyc.id, n2.id, { id: 'n-e6', title: 'Breakfast at Juliana\'s Pizza', category: 'RESTAURANT', status: 'TENTATIVE', startTime: dt('2026-09-11', '10:30:00'), endTime: dt('2026-09-11', '11:30:00'), locationName: '1 Front St, Brooklyn', notes: 'Ranked best pizza in NYC. Arrive early — queues get long.', order: 1 });
  await upsertEvent(nyc.id, n2.id, { id: 'n-e7', title: 'DUMBO & Brooklyn Heights Promenade', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-11', '12:00:00'), endTime: dt('2026-09-11', '14:00:00'), locationName: 'DUMBO, Brooklyn', order: 2 });
  await upsertEvent(nyc.id, n2.id, { id: 'n-e8', title: 'Brooklyn Museum', category: 'ACTIVITY', status: 'TENTATIVE', startTime: dt('2026-09-11', '14:30:00'), endTime: dt('2026-09-11', '17:30:00'), locationName: '200 Eastern Pkwy, Brooklyn', order: 3 });
  await upsertEvent(nyc.id, n2.id, { id: 'n-e9', title: 'Dinner at Peter Luger Steak House', category: 'RESTAURANT', status: 'TENTATIVE', startTime: dt('2026-09-11', '19:00:00'), endTime: dt('2026-09-11', '21:00:00'), locationName: '178 Broadway, Brooklyn', notes: 'Cash only! Must book weeks in advance. The steak is legendary.', order: 4 });

  // Day 3 — Central Park & Museums
  const n3 = await upsertDay(nyc.id, '2026-09-12', 'Central Park & Upper East Side');
  await upsertEvent(nyc.id, n3.id, { id: 'n-e10', title: 'Morning jog in Central Park', category: 'ACTIVITY', status: 'TENTATIVE', startTime: dt('2026-09-12', '07:00:00'), endTime: dt('2026-09-12', '08:30:00'), locationName: 'Central Park, Manhattan', order: 0 });
  await upsertEvent(nyc.id, n3.id, { id: 'n-e11', title: 'Metropolitan Museum of Art', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-12', '10:00:00'), endTime: dt('2026-09-12', '14:00:00'), locationName: '1000 Fifth Avenue, Manhattan', notes: 'Allow at least 3-4 hours. Egyptian wing and Temple of Dendur are highlights.', order: 1 });
  await upsertEvent(nyc.id, n3.id, { id: 'n-e12', title: 'Lunch at The Boathouse', category: 'RESTAURANT', status: 'TENTATIVE', startTime: dt('2026-09-12', '14:30:00'), endTime: dt('2026-09-12', '16:00:00'), locationName: 'Central Park Boathouse, Manhattan', order: 2 });
  await upsertEvent(nyc.id, n3.id, { id: 'n-e13', title: 'Solomon R. Guggenheim Museum', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-12', '16:30:00'), endTime: dt('2026-09-12', '19:00:00'), locationName: '1071 Fifth Avenue, Manhattan', order: 3 });

  // Day 4 — Downtown & 9/11
  const n4 = await upsertDay(nyc.id, '2026-09-13', 'Lower Manhattan');
  await upsertEvent(nyc.id, n4.id, { id: 'n-e14', title: '9/11 Memorial & Museum', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-13', '09:00:00'), endTime: dt('2026-09-13', '12:00:00'), locationName: '180 Greenwich St, Manhattan', order: 0, bookingRef: { provider: '9/11 Museum', reference: 'NMM-6634' } });
  await upsertEvent(nyc.id, n4.id, { id: 'n-e15', title: 'One World Observatory', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-13', '12:30:00'), endTime: dt('2026-09-13', '14:00:00'), locationName: '285 Fulton Street, Manhattan', order: 1 });
  await upsertEvent(nyc.id, n4.id, { id: 'n-e16', title: 'Wall Street & Charging Bull', category: 'FREE_TIME', status: 'TENTATIVE', startTime: dt('2026-09-13', '14:30:00'), endTime: dt('2026-09-13', '16:00:00'), locationName: 'Wall Street, Manhattan', order: 2 });
  await upsertEvent(nyc.id, n4.id, { id: 'n-e17', title: 'Staten Island Ferry (skyline views — free!)', category: 'FERRY', status: 'TENTATIVE', startTime: dt('2026-09-13', '16:30:00'), endTime: dt('2026-09-13', '17:30:00'), locationName: 'Whitehall Terminal, Manhattan', order: 3 });

  // Day 5 — Midtown
  const n5 = await upsertDay(nyc.id, '2026-09-14', 'Midtown & Times Square');
  await upsertEvent(nyc.id, n5.id, { id: 'n-e18', title: 'Top of the Rock — Empire State view', category: 'SIGHTSEEING', status: 'TENTATIVE', startTime: dt('2026-09-14', '09:00:00'), endTime: dt('2026-09-14', '10:30:00'), locationName: '30 Rockefeller Plaza, Manhattan', order: 0, bookingRef: { provider: 'Top of the Rock', reference: 'TOR-2026-4421' } });
  await upsertEvent(nyc.id, n5.id, { id: 'n-e19', title: 'MoMA — Museum of Modern Art', category: 'ACTIVITY', status: 'TENTATIVE', startTime: dt('2026-09-14', '11:00:00'), endTime: dt('2026-09-14', '14:30:00'), locationName: '11 W 53rd St, Manhattan', order: 1 });
  await upsertEvent(nyc.id, n5.id, { id: 'n-e20', title: 'Broadway — Hamilton', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2026-09-14', '20:00:00'), endTime: dt('2026-09-14', '22:30:00'), locationName: 'Richard Rodgers Theatre, W 46th St', order: 2, bookingRef: { provider: 'Ticketmaster', reference: 'TM-HAM-9981' }, notes: 'Premium seats, Row F centre. Arrive 30 mins early.' });

  console.log('✓ New York City — PLANNING');

  // ── Update Japan trip with more events ────────────────────────────────────

  const japanDay2 = await upsertDay('seed-trip-japan-2025', '2025-10-02', 'Tokyo Arrival & Shinjuku');
  await upsertEvent('seed-trip-japan-2025', japanDay2.id, { id: 'j-e2', title: 'Check-in — Park Hyatt Tokyo', category: 'ACCOMMODATION', status: 'CONFIRMED', startTime: dt('2025-10-02', '15:00:00'), locationName: '3-7-1-2 Nishi-Shinjuku, Shinjuku', order: 0, bookingRef: { provider: 'Hyatt', reference: 'HY-2025-7741' } });
  await upsertEvent('seed-trip-japan-2025', japanDay2.id, { id: 'j-e3', title: 'Shinjuku Gyoen National Garden', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2025-10-02', '16:30:00'), endTime: dt('2025-10-02', '18:30:00'), locationName: '11 Naitomachi, Shinjuku', order: 1 });
  await upsertEvent('seed-trip-japan-2025', japanDay2.id, { id: 'j-e4', title: 'Ramen dinner at Ichiran', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2025-10-02', '19:30:00'), endTime: dt('2025-10-02', '21:00:00'), locationName: 'Shinjuku Ichibangai', order: 2 });

  const japanDay3 = await upsertDay('seed-trip-japan-2025', '2025-10-03', 'Tokyo — Temples & Culture');
  await upsertEvent('seed-trip-japan-2025', japanDay3.id, { id: 'j-e5', title: 'Senso-ji Temple, Asakusa', category: 'SIGHTSEEING', status: 'CONFIRMED', startTime: dt('2025-10-03', '08:00:00'), endTime: dt('2025-10-03', '10:30:00'), locationName: '2 Chome-3-1 Asakusa, Taito City', notes: 'Go at dawn to avoid crowds. Nakamise shopping street after.', order: 0 });
  await upsertEvent('seed-trip-japan-2025', japanDay3.id, { id: 'j-e6', title: 'Akihabara Electric Town', category: 'FREE_TIME', status: 'CONFIRMED', startTime: dt('2025-10-03', '11:30:00'), endTime: dt('2025-10-03', '14:00:00'), locationName: 'Akihabara, Chiyoda', order: 1 });
  await upsertEvent('seed-trip-japan-2025', japanDay3.id, { id: 'j-e7', title: 'TeamLab Planets', category: 'ACTIVITY', status: 'CONFIRMED', startTime: dt('2025-10-03', '15:00:00'), endTime: dt('2025-10-03', '17:30:00'), locationName: '6-1-16 Toyosu, Koto City', order: 2, bookingRef: { provider: 'TeamLab', reference: 'TL-6629' } });
  await upsertEvent('seed-trip-japan-2025', japanDay3.id, { id: 'j-e8', title: 'Omakase dinner — Sushi Yoshitake', category: 'RESTAURANT', status: 'CONFIRMED', startTime: dt('2025-10-03', '19:00:00'), endTime: dt('2025-10-03', '21:00:00'), locationName: '3F, 9-7 Ginza, Chuo City', notes: '3 Michelin stars. Book 3 months ahead. ¥40,000 per person.', order: 3, bookingRef: { provider: 'Tableall', reference: 'TA-YSH-441' } });

  console.log('✓ Japan Explorer 2025 — enhanced');

  // Summary
  console.log('\n─────────────────────────────────────────');
  console.log('Demo data ready!\n');
  console.log('Trips in demo account:');
  console.log('  1. Paris Long Weekend          — COMPLETED (Jan 2026)');
  console.log('  2. Italian Grand Tour          — ACTIVE    (Jun 2026)');
  console.log('  3. New York City Fall 2026     — PLANNING  (Sep 2026)');
  console.log('  4. Japan Explorer 2025         — PLANNING  (Oct 2025) [enhanced]');
  console.log('\nExtra user:');
  console.log('  sarah@wanderlog.app / Demo1234!');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function upsertDay(tripId: string, date: string, title?: string) {
  return prisma.itineraryDay.upsert({
    where: { tripId_date: { tripId, date: new Date(date) } },
    create: { tripId, date: new Date(date), title },
    update: { title },
  });
}

interface EventInput {
  id: string;
  title: string;
  category: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  locationName?: string;
  notes?: string;
  order: number;
  bookingRef?: { provider: string; reference: string };
}

async function upsertEvent(tripId: string, dayId: string, e: EventInput) {
  const event = await prisma.itineraryEvent.upsert({
    where: { id: e.id },
    create: {
      id: e.id, tripId, dayId,
      title: e.title,
      category: e.category as never,
      status: e.status as never,
      startTime: e.startTime,
      endTime: e.endTime,
      locationName: e.locationName,
      notes: e.notes,
      order: e.order,
    },
    update: {},
  });

  if (e.bookingRef) {
    const existing = await prisma.bookingReference.findFirst({ where: { eventId: event.id } });
    if (!existing) {
      await prisma.bookingReference.create({
        data: { eventId: event.id, provider: e.bookingRef.provider, reference: e.bookingRef.reference },
      });
    }
  }

  return event;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
