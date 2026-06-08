import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as usersService from './users.service.js';
import type { Request, Response, NextFunction } from 'express';

function handler(fn: (userId: string, req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fn((req as AuthenticatedRequest).userId, req);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const usersRouter = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  // Email is optional now — allow setting a valid address or clearing it ('').
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
});

const updatePreferencesSchema = z.record(z.unknown());

usersRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.getUserById((req as AuthenticatedRequest).userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.updateUserProfile(
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get('/me/upcoming', authenticate, handler((id) => usersService.getUpcomingEvents(id)));
usersRouter.get('/me/people',   authenticate, handler((id) => usersService.getAllCollaborators(id)));
usersRouter.get('/me/documents',authenticate, handler((id) => usersService.getAllDocuments(id)));
usersRouter.get('/me/budgets',  authenticate, handler((id) => usersService.getAllTripBudgets(id)));

usersRouter.patch(
  '/me/preferences',
  authenticate,
  validate(updatePreferencesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await usersService.updateUserPreferences(
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);
