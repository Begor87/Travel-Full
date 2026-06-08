import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { requireAdmin } from '../../shared/middleware/requireAdmin.js';
import { validate } from '../../shared/middleware/validate.js';
import * as adminService from './admin.service.js';
import type { Request, Response, NextFunction } from 'express';

export const adminRouter = Router();

// All admin routes require an authenticated admin
adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: await adminService.listUsers() });
  } catch (err) { next(err); }
});

const updateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

adminRouter.patch('/users/:userId', validate(updateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.updateUser(req.params.userId, (req as AuthenticatedRequest).userId, req.body);
    res.json({ data });
  } catch (err) { next(err); }
});

adminRouter.post('/users/:userId/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.resetPassword(req.params.userId);
    res.json({ data }); // { tempPassword }
  } catch (err) { next(err); }
});

adminRouter.delete('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteUser(req.params.userId, (req as AuthenticatedRequest).userId);
    res.status(204).send();
  } catch (err) { next(err); }
});

adminRouter.get('/signup-code', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: { code: await adminService.getSignupCode() } });
  } catch (err) { next(err); }
});

adminRouter.post('/signup-code/regenerate', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: { code: await adminService.regenerateSignupCode() } });
  } catch (err) { next(err); }
});
