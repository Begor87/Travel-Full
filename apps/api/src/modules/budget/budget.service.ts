import { prisma, Prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

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

export async function getBudgetSummary(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  const [budget, expenses] = await Promise.all([
    prisma.budget.findUnique({ where: { tripId } }),
    prisma.expense.findMany({ where: { tripId } }),
  ]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const expense of expenses) {
    const cat = expense.category.toLowerCase();
    byCategory[cat] = (byCategory[cat] ?? 0) + expense.amount;
  }

  return {
    totalBudget: budget?.totalAmount ?? 0,
    totalSpent,
    remaining: (budget?.totalAmount ?? 0) - totalSpent,
    currency: budget?.currency ?? 'USD',
    byCategory,
    expenseCount: expenses.length,
  };
}
