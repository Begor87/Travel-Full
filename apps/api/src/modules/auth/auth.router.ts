import { Router } from 'express';
import { loginSchema, registerSchema, refreshTokenSchema } from '@wanderlog/shared';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import * as authService from './auth.service.js';
import type { Request, Response, NextFunction } from 'express';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.register(req.body);
      res.status(201).json({ data: tokens });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.login(req.body);
      res.json({ data: tokens });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshTokens(req.body.refreshToken);
      res.json({ data: tokens });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
