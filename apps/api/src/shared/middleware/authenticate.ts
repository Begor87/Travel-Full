import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../errors/AppError.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
}

interface JwtPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AuthenticationError());
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    (req as AuthenticatedRequest).userId = payload.sub;
    (req as AuthenticatedRequest).userRole = payload.role;
    next();
  } catch {
    next(new AuthenticationError('Invalid or expired token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    (req as AuthenticatedRequest).userId = payload.sub;
    (req as AuthenticatedRequest).userRole = payload.role;
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}
