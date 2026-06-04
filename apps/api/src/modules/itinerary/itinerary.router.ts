import { Router } from 'express';
import { z } from 'zod';
import { createEventSchema, updateEventSchema } from '@wanderlog/shared';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as itineraryService from './itinerary.service.js';
import type { Request, Response, NextFunction } from 'express';

export const itineraryRouter = Router({ mergeParams: true });

// GET /trips/:tripId/itinerary
itineraryRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = await itineraryService.getTripItinerary(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: days });
    } catch (err) {
      next(err);
    }
  },
);

// GET /trips/:tripId/itinerary/conflicts
itineraryRouter.get(
  '/conflicts',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conflicts = await itineraryService.detectConflicts(req.params.tripId);
      res.json({ data: conflicts });
    } catch (err) {
      next(err);
    }
  },
);

// POST /trips/:tripId/itinerary/days/:dayId/events
itineraryRouter.post(
  '/days/:dayId/events',
  authenticate,
  validate(createEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await itineraryService.createEvent(
        req.params.tripId,
        req.params.dayId,
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.status(201).json({ data: event });
    } catch (err) {
      next(err);
    }
  },
);

// POST /trips/:tripId/itinerary/days/:dayId/events/reorder
itineraryRouter.post(
  '/days/:dayId/events/reorder',
  authenticate,
  validate(z.object({ ids: z.array(z.string()).min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await itineraryService.reorderEvents(
        req.params.dayId,
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.body.ids,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /trips/:tripId/itinerary/events/:eventId
itineraryRouter.patch(
  '/events/:eventId',
  authenticate,
  validate(updateEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await itineraryService.updateEvent(
        req.params.eventId,
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.body,
      );
      res.json({ data: event });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /trips/:tripId/itinerary/events/:eventId
itineraryRouter.delete(
  '/events/:eventId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await itineraryService.deleteEvent(
        req.params.eventId,
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
