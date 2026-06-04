import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import * as collabService from './collaboration.service.js';
import type { Request, Response, NextFunction } from 'express';

export const collaborationRouter = Router({ mergeParams: true });

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
});

const updateRoleSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
});

collaborationRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collaborators = await collabService.getCollaborators(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
      );
      res.json({ data: collaborators });
    } catch (err) {
      next(err);
    }
  },
);

collaborationRouter.post(
  '/invite',
  authenticate,
  validate(inviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await collabService.inviteCollaborator(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.body.email,
        req.body.role,
      );
      res.status(201).json({ data: invitation });
    } catch (err) {
      next(err);
    }
  },
);

collaborationRouter.patch(
  '/:userId/role',
  authenticate,
  validate(updateRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collaborator = await collabService.updateCollaboratorRole(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.params.userId,
        req.body.role,
      );
      res.json({ data: collaborator });
    } catch (err) {
      next(err);
    }
  },
);

collaborationRouter.delete(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await collabService.removeCollaborator(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        req.params.userId,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

collaborationRouter.get(
  '/activity',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const activity = await collabService.getActivityLog(
        req.params.tripId,
        (req as AuthenticatedRequest).userId,
        page,
      );
      res.json({ data: activity });
    } catch (err) {
      next(err);
    }
  },
);
