import { prisma, Prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { convertCurrency } from '@wanderlog/shared';
import { getRates } from '../../services/exchangeRates.js';

export async function getBudget(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  return prisma.budget.findUnique({ where: { tripId } });
}

export async function upsertBudget(
  tripId: string,
  userId: string,
  data: { totalAmount: number; currency: string; categories?: Prisma.InputJsonValue[] },
) {
  await assertTripAccess(tripId, userId, 'write');

  const categories = (data.categories ?? []) as Prisma.InputJsonValue;

  return prisma.budget.upsert({
    where: { tripId },
    create: { tripId, totalAmount: data.totalAmount, currency: data.currency, categories },
    update: { totalAmount: data.totalAmount, currency: data.currency, categories },
  });
}

export async function listExpenses(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  return prisma.expense.findMany({
    where: { tripId },
    include: {
      paidBy: { select: { id: true, name: true, avatarUrl: true } },
      receipt: { select: { id: true, title: true } },
    },
    orderBy: { date: 'desc' },
  });
}

export async function createExpense(
  tripId: string,
  userId: string,
  data: {
    title: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    notes?: string;
    linkedEventId?: string;
    splits?: unknown[];
  },
) {
  await assertTripAccess(tripId, userId, 'write');

  return prisma.expense.create({
    data: {
      tripId,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      category: data.category.toUpperCase() as never,
      paidById: userId,
      date: new Date(data.date),
      notes: data.notes,
      linkedEventId: data.linkedEventId,
      splits: (data.splits ?? []) as Prisma.InputJsonValue,
    },
    include: {
      paidBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

export async function updateExpense(
  expenseId: string,
  tripId: string,
  userId: string,
  data: Partial<{
    title: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    notes: string;
    linkedEventId: string | null;
    splits: unknown[];
  }>,
) {
  await assertTripAccess(tripId, userId, 'write');

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.tripId !== tripId) throw new NotFoundError('Expense');

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.category && { category: data.category.toUpperCase() as never }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.linkedEventId !== undefined && { linkedEventId: data.linkedEventId }),
      ...(data.splits && { splits: data.splits as Prisma.InputJsonValue }),
    },
    include: { paidBy: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function deleteExpense(expenseId: string, tripId: string, userId: string) {
  await assertTripAccess(tripId, userId, 'write');

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.tripId !== tripId) throw new NotFoundError('Expense');

  await prisma.expense.delete({ where: { id: expenseId } });
}

/**
 * Builds a full budget summary in the trip's reporting currency.
 *
 * Spending is aggregated from two sources, each potentially in a different
 * currency, all converted to the reporting currency at current rates:
 *   1. Standalone expenses (flights, hotels, anything logged in /budget)
 *   2. Costs attached directly to itinerary events (the per-activity cost
 *      field), EXCEPT events that already have a linked expense — those would
 *      double-count, so the linked expense wins.
 */
export async function getBudgetSummary(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  const [budget, expenses, events, rates] = await Promise.all([
    prisma.budget.findUnique({ where: { tripId } }),
    prisma.expense.findMany({ where: { tripId } }),
    prisma.itineraryEvent.findMany({
      where: { tripId, cost: { not: null }, status: { not: 'CANCELLED' } },
      select: { id: true, cost: true, costCurrency: true, category: true, title: true },
    }),
    getRates(),
  ]);

  const reporting = budget?.currency ?? 'USD';
  const conv = (amount: number, from: string) =>
    convertCurrency(amount, from, reporting, rates);

  const byCategory: Record<string, number> = {};
  let totalSpent = 0;

  // 1. Standalone expenses
  const linkedEventIds = new Set<string>();
  for (const expense of expenses) {
    const converted = conv(expense.amount, expense.currency);
    totalSpent += converted;
    const cat = expense.category.toLowerCase();
    byCategory[cat] = (byCategory[cat] ?? 0) + converted;
    if (expense.linkedEventId) linkedEventIds.add(expense.linkedEventId);
  }

  // 2. Event costs — skip events that already have a linked expense
  let eventCostTotal = 0;
  for (const event of events) {
    if (!event.cost || linkedEventIds.has(event.id)) continue;
    const converted = conv(event.cost, event.costCurrency ?? reporting);
    totalSpent += converted;
    eventCostTotal += converted;
    const cat = mapEventCategoryToBudget(event.category);
    byCategory[cat] = (byCategory[cat] ?? 0) + converted;
  }

  const totalBudget = budget?.totalAmount ?? 0;

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    currency: reporting,
    byCategory,
    expenseCount: expenses.length,
    eventCostTotal,
    usingLiveRates: !!process.env.EXCHANGE_RATE_API_KEY,
  };
}

/** Maps an itinerary event category to the closest budget expense category. */
function mapEventCategoryToBudget(eventCategory: string): string {
  const c = eventCategory.toUpperCase();
  if (['FLIGHT', 'TRAIN', 'BUS', 'FERRY', 'CAR'].includes(c)) return 'transport';
  if (c === 'ACCOMMODATION') return 'accommodation';
  if (c === 'RESTAURANT') return 'food';
  if (['ACTIVITY', 'SIGHTSEEING'].includes(c)) return 'activities';
  return 'other';
}
