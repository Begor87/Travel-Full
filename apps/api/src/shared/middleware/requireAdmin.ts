import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors/AppError.js';
import type { AuthenticatedRequest } from './authenticate.js';

/**
 * Restricts a route to admins. Must run after `authenticate` (which populates
 * userRole from the JWT). The role claim is set at token-issue time; combined
 * with the 15-minute access-token lifetime, a demotion takes effect within one
 * token cycle.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if ((req as AuthenticatedRequest).userRole !== 'ADMIN') {
    return next(new AuthorizationError('Administrator access required'));
  }
  next();
}
