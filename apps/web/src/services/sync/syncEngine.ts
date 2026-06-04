import { offlineDB } from '../offline/db.ts';
import { api } from '../api/client.ts';
import { SYNC_RETRY_DELAYS } from '@wanderlog/shared';

interface SyncResult {
  succeeded: number;
  failed: number;
  errors: string[];
}

export async function flushSyncQueue(): Promise<SyncResult> {
  const queue = await offlineDB.getSyncQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0, errors: [] };

  const result: SyncResult = { succeeded: 0, failed: 0, errors: [] };

  for (const op of queue) {
    try {
      await executeSyncOperation(op);
      await offlineDB.removeSyncOperation(op.id);
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : 'Unknown error');

      // Exponential backoff — increment retry count
      const maxRetries = SYNC_RETRY_DELAYS.length;
      if (op.retryCount >= maxRetries) {
        // Give up and discard the operation after max retries
        await offlineDB.removeSyncOperation(op.id);
      }
    }
  }

  return result;
}

async function executeSyncOperation(op: {
  type: string;
  entityType: string;
  entityId: string;
  payload: unknown;
}) {
  const { type, entityType, entityId, payload } = op;

  switch (entityType) {
    case 'event': {
      if (type === 'create') {
        const { dayId, tripId, ...data } = payload as { dayId: string; tripId: string; [key: string]: unknown };
        await api.post(`/trips/${tripId}/itinerary/days/${dayId}/events`, data);
      } else if (type === 'update') {
        const { tripId, ...data } = payload as { tripId: string; [key: string]: unknown };
        await api.patch(`/trips/${tripId}/itinerary/events/${entityId}`, data);
      } else if (type === 'delete') {
        const { tripId } = payload as { tripId: string };
        await api.delete(`/trips/${tripId}/itinerary/events/${entityId}`);
      }
      break;
    }

    case 'expense': {
      if (type === 'create') {
        const { tripId, ...data } = payload as { tripId: string; [key: string]: unknown };
        await api.post(`/trips/${tripId}/budget/expenses`, data);
      } else if (type === 'delete') {
        const { tripId } = payload as { tripId: string };
        await api.delete(`/trips/${tripId}/budget/expenses/${entityId}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
