import { Router } from 'express';
import { z } from 'zod';
import { createTripSchema, updateTripSchema } from '@wanderlog/shared';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as tripsService from './trips.service.js';
import type { Request, Response, NextFunction } from 'express';

export const tripsRouter = Router();

const listQuerySchema = z.object({
  status: z.enum(['planning', 'active', 'completed', 'archived']).optional(),
});

tripsRouter.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trips = await tripsService.listTrips(
        (req as AuthenticatedRequest).userId,
        req.query.status as string | undefined,
      );
      res.json({ data: trips });
    } catch (err) {
      next(err);
    }
  },
);

tripsRouter.post(
  '/',
  authenticate,
  validate(createTripSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await tripsService.createTrip(
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.status(201).json({ data: trip });
    } catch (err) {
      next(err);
    }
  },
);

tripsRouter.get(
  '/:tripId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await tripsService.getTripById(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: trip });
    } catch (err) {
      next(err);
    }
  },
);

tripsRouter.patch(
  '/:tripId',
  authenticate,
  validate(updateTripSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await tripsService.updateTrip(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.json({ data: trip });
    } catch (err) {
      next(err);
    }
  },
);

tripsRouter.delete(
  '/:tripId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tripsService.deleteTrip(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

tripsRouter.post(
  '/:tripId/duplicate',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trip = await tripsService.duplicateTrip(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.status(201).json({ data: trip });
    } catch (err) {
      next(err);
    }
  },
);
