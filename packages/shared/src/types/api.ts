export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  cursor?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  accessCode: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

// WebSocket event types for real-time collaboration
export type WsEventType =
  | 'trip:updated'
  | 'event:created'
  | 'event:updated'
  | 'event:deleted'
  | 'collaborator:joined'
  | 'collaborator:left'
  | 'comment:created'
  | 'presence:update'
  | 'sync:conflict';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  tripId: string;
  userId: string;
  payload: T;
  timestamp: string;
}

// Sync operation for offline-first architecture
export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: string;
  entityId: string;
  payload: unknown;
  timestamp: string;
  retryCount: number;
}
