import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './shared/middleware/errorHandler.js';
import { logger } from './shared/utils/logger.js';
import { createWebSocketServer } from './services/websocket.js';

import { authRouter } from './modules/auth/auth.router.js';
import { usersRouter } from './modules/users/users.router.js';
import { tripsRouter } from './modules/trips/trips.router.js';
import { itineraryRouter } from './modules/itinerary/itinerary.router.js';
import { collaborationRouter } from './modules/collaboration/collaboration.router.js';
import { budgetRouter } from './modules/budget/budget.router.js';
import { aiRouter } from './modules/ai/ai.router.js';

const app = express();

// ─── Security & Performance ───────────────────────────────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

app.use('/api', limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

const API = '/api/v1';

app.use(`${API}/auth`, authRouter);
app.use(`${API}/users`, usersRouter);
app.use(`${API}/trips`, tripsRouter);
app.use(`${API}/trips/:tripId/itinerary`, itineraryRouter);
app.use(`${API}/trips/:tripId/collaborators`, collaborationRouter);
app.use(`${API}/trips/:tripId/budget`, budgetRouter);
app.use(`${API}/trips/:tripId/ai`, aiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler (must be last)
app.use(errorHandler);

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001');
const server = http.createServer(app);

createWebSocketServer(server);

server.listen(PORT, () => {
  logger.info(`API server listening on http://localhost:${PORT}`);
  logger.info(`WebSocket server ready at ws://localhost:${PORT}/ws`);
  logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
