import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as budgetService from './budget.service.js';
import type { Request, Response, NextFunction } from 'express';

export const budgetRouter = Router({ mergeParams: true });

const upsertBudgetSchema = z.object({
  totalAmount: z.number().min(0),
  currency: z.string().length(3),
  categories: z.array(z.unknown()).optional(),
});

const expenseCategoryEnum = z.enum(['accommodation', 'transport', 'food', 'activities', 'shopping', 'health', 'communication', 'other']);

const createExpenseSchema = z.object({
  title: z.string().min(1).max(300),
  amount: z.number().min(0.01),
  currency: z.string().length(3),
  category: expenseCategoryEnum,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
  linkedEventId: z.string().optional(),
  splits: z.array(z.unknown()).optional(),
});

const updateExpenseSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  amount: z.number().min(0.01).optional(),
  currency: z.string().length(3).optional(),
  category: expenseCategoryEnum.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  linkedEventId: z.string().nullable().optional(),
  splits: z.array(z.unknown()).optional(),
});

budgetRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const budget = await budgetService.getBudget(req.params.tripId, (req as AuthenticatedRequest).userId);
    res.json({ data: budget });
  } catch (err) { next(err); }
});

budgetRouter.put('/', authenticate, validate(upsertBudgetSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const budget = await budgetService.upsertBudget(req.params.tripId, (req as AuthenticatedRequest).userId, req.body);
    res.json({ data: budget });
  } catch (err) { next(err); }
});

budgetRouter.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await budgetService.getBudgetSummary(req.params.tripId, (req as AuthenticatedRequest).userId);
    res.json({ data: summary });
  } catch (err) { next(err); }
});

budgetRouter.get('/expenses', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expenses = await budgetService.listExpenses(req.params.tripId, (req as AuthenticatedRequest).userId);
    res.json({ data: expenses });
  } catch (err) { next(err); }
});

budgetRouter.post('/expenses', authenticate, validate(createExpenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await budgetService.createExpense(req.params.tripId, (req as AuthenticatedRequest).userId, req.body);
    res.status(201).json({ data: expense });
  } catch (err) { next(err); }
});

budgetRouter.patch('/expenses/:expenseId', authenticate, validate(updateExpenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await budgetService.updateExpense(req.params.expenseId, req.params.tripId, (req as AuthenticatedRequest).userId, req.body);
    res.json({ data: expense });
  } catch (err) { next(err); }
});

budgetRouter.delete('/expenses/:expenseId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await budgetService.deleteExpense(req.params.expenseId, req.params.tripId, (req as AuthenticatedRequest).userId);
    res.status(204).send();
  } catch (err) { next(err); }
});
