import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema } from '@wanderlog/shared';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import * as authService from './auth.service.js';
import type { Request, Response, NextFunction } from 'express';

export const authRouter = Router();

// Stricter limiter on credential-checking endpoints to slow brute force,
// independent of the generous global API limit.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 50 attempts per 15 min per IP — enough headroom for a shared family IP,
  // tight enough to stop sustained brute force (~1 try / 18s).
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '50'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many attempts, please try again later' } },
});

authRouter.post(
  '/register',
  authLimiter,
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
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate shape minimally — always return 401 for bad credentials,
    // never 422, so the response doesn't reveal whether the format or the
    // credentials were wrong.
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new (await import('../../shared/errors/AppError.js')).AuthenticationError('Invalid email or password'));
    }
    try {
      const tokens = await authService.login(parsed.data);
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

authRouter.post(
  '/logout-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutAll((req as AuthenticatedRequest).userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(
        (req as AuthenticatedRequest).userId,
        req.body.currentPassword,
        req.body.newPassword,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
