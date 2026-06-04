import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as aiService from './ai.service.js';
import type { Request, Response, NextFunction } from 'express';

export const aiRouter = Router({ mergeParams: true });

aiRouter.post(
  '/optimise-day/:dayId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.optimiseDay(
        req.params.tripId,
        req.params.dayId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/find-gaps',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.findItineraryGaps(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/suggest-activities',
  authenticate,
  validate(z.object({ query: z.string().min(1).max(500) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.suggestActivities(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.body.query,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

aiRouter.post(
  '/packing-list',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.generatePackingList(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);
