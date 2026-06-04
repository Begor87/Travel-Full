import { PrismaClient, Prisma } from '@prisma/client';
export { Prisma };
import { logger } from '../shared/utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
      : ['error'],
  });
}

// In development, reuse the client to avoid exhausting connections during HMR
export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 200) {
      logger.warn('Slow query detected', { query: e.query, durationMs: e.duration });
    }
  });
}
