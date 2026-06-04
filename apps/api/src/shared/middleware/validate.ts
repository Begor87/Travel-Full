import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError.js';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details: Record<string, string[]> = {};
      result.error.errors.forEach((e) => {
        const key = e.path.join('.') || '_root';
        details[key] = [...(details[key] ?? []), e.message];
      });
      return next(new ValidationError('Validation failed', details));
    }
    req[part] = result.data;
    next();
  };
}
