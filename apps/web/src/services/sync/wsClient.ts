import type { WsEvent } from '@wanderlog/shared';

type EventHandler = (event: WsEvent) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? '/ws';

class WebSocketClient {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private subscribedTrips = new Set<string>();

  connect(token: string) {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      // Resubscribe to all trips after reconnect
      for (const tripId of this.subscribedTrips) {
        this.subscribe(tripId);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        const handlers = this.handlers.get(data.type);
        if (handlers) {
          handlers.forEach((h) => h(data));
        }
        // Also dispatch to wildcard handlers
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((h) => h(data));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.socket.onclose = (e) => {
      if (e.code === 4001) return; // Auth failure — don't reconnect

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(token);
        }, delay);
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.socket?.close(1000, 'Client disconnect');
    this.socket = null;
    this.subscribedTrips.clear();
  }

  subscribe(tripId: string) {
    this.subscribedTrips.add(tripId);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', tripId }));
    }
  }

  unsubscribe(tripId: string) {
    this.subscribedTrips.delete(tripId);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', tripId }));
    }
  }

  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Singleton client
export const wsClient = new WebSocketClient();
