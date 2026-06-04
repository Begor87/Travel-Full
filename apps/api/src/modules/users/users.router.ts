import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as usersService from './users.service.js';
import type { Request, Response, NextFunction } from 'express';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
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
