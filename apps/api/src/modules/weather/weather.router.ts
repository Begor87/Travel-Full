import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import * as weatherService from './weather.service.js';
import type { Request, Response, NextFunction } from 'express';

export const weatherRouter = Router({ mergeParams: true });

// GET /trips/:tripId/weather
weatherRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forecast = await weatherService.getTripWeather(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: forecast });
    } catch (err) {
      next(err);
    }
  },
);

// GET /trips/:tripId/weather/day/:date  (YYYY-MM-DD) — detail for the popup
weatherRouter.get(
  '/day/:date',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await weatherService.getDayDetail(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.params.date,
      );
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  },
);
