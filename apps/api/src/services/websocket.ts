import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';
import { logger } from '../shared/utils/logger.js';

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  subscribedTrips: Set<string>;
}

interface WsMessage {
  type: string;
  tripId?: string;
  payload?: unknown;
}

// Map of tripId -> Set of connected socket clients
const tripSubscriptions = new Map<string, Set<AuthenticatedSocket>>();

export function createWebSocketServer(server: import('http').Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (rawSocket: WebSocket, req: IncomingMessage) => {
    const socket = rawSocket as AuthenticatedSocket;
    socket.subscribedTrips = new Set();

    // Authenticate via query param token
    const url = new URL(req.url ?? '', 'ws://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Authentication required');
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      socket.userId = payload.sub;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    logger.debug('WebSocket connected', { userId: socket.userId });

    socket.on('message', (data) => {
      try {
        const message: WsMessage = JSON.parse(data.toString());
        handleMessage(socket, message);
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    socket.on('close', () => {
      // Clean up subscriptions
      for (const tripId of socket.subscribedTrips) {
        const subscribers = tripSubscriptions.get(tripId);
        subscribers?.delete(socket);
        if (subscribers?.size === 0) {
          tripSubscriptions.delete(tripId);
        }

        // Notify others of departure
        broadcastToTrip(tripId, socket.userId, {
          type: 'presence:update',
          tripId,
          userId: socket.userId,
          payload: { status: 'offline' },
          timestamp: new Date().toISOString(),
        });
      }
      logger.debug('WebSocket disconnected', { userId: socket.userId });
    });

    socket.on('error', (err) => {
      logger.error('WebSocket error', { userId: socket.userId, error: err.message });
    });

    socket.send(JSON.stringify({ type: 'connected', userId: socket.userId }));
  });

  return wss;
}

function handleMessage(socket: AuthenticatedSocket, message: WsMessage) {
  switch (message.type) {
    case 'subscribe': {
      const { tripId } = message;
      if (!tripId) return;

      socket.subscribedTrips.add(tripId);
      if (!tripSubscriptions.has(tripId)) {
        tripSubscriptions.set(tripId, new Set());
      }
      tripSubscriptions.get(tripId)!.add(socket);

      // Notify others of presence
      broadcastToTrip(tripId, socket.userId, {
        type: 'presence:update',
        tripId,
        userId: socket.userId,
        payload: { status: 'online' },
        timestamp: new Date().toISOString(),
      });

      socket.send(JSON.stringify({ type: 'subscribed', tripId }));
      break;
    }

    case 'unsubscribe': {
      const { tripId } = message;
      if (!tripId) return;

      socket.subscribedTrips.delete(tripId);
      tripSubscriptions.get(tripId)?.delete(socket);
      socket.send(JSON.stringify({ type: 'unsubscribed', tripId }));
      break;
    }

    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    default:
      logger.debug('Unknown WS message type', { type: message.type });
  }
}

// Broadcast an event to all subscribers of a trip except the sender
export function broadcastToTrip(
  tripId: string,
  senderUserId: string,
  event: Record<string, unknown>,
  excludeSender = true,
) {
  const subscribers = tripSubscriptions.get(tripId);
  if (!subscribers) return;

  const message = JSON.stringify(event);
  for (const socket of subscribers) {
    if (excludeSender && socket.userId === senderUserId) continue;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

// Broadcast to ALL subscribers including sender (e.g. for conflict notifications)
export function broadcastTripUpdate(
  tripId: string,
  event: Record<string, unknown>,
) {
  const subscribers = tripSubscriptions.get(tripId);
  if (!subscribers) return;

  const message = JSON.stringify(event);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}
