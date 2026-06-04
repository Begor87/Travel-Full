// IndexedDB wrapper for offline-first data persistence

const DB_NAME = 'wanderlog-offline';
const DB_VERSION = 1;

type StoreNames = 'trips' | 'itinerary' | 'sync_queue' | 'documents';

interface DBSchema {
  trips: { id: string; data: unknown; cachedAt: number };
  itinerary: { id: string; tripId: string; data: unknown; cachedAt: number };
  sync_queue: { id: string; type: string; entityType: string; entityId: string; payload: unknown; timestamp: number; retryCount: number };
  documents: { id: string; data: unknown; blob?: Blob; cachedAt: number };
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('trips')) {
        const store = db.createObjectStore('trips', { keyPath: 'id' });
        store.createIndex('cachedAt', 'cachedAt');
      }

      if (!db.objectStoreNames.contains('itinerary')) {
        const store = db.createObjectStore('itinerary', { keyPath: 'id' });
        store.createIndex('tripId', 'tripId');
        store.createIndex('cachedAt', 'cachedAt');
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('cachedAt', 'cachedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: StoreNames,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineDB = {
  // Trips
  async cacheTrip(trip: { id: string; [key: string]: unknown }) {
    return withStore('trips', 'readwrite', (store) =>
      store.put({ id: trip.id, data: trip, cachedAt: Date.now() }),
    );
  },

  async getCachedTrip(tripId: string) {
    const result = await withStore<DBSchema['trips'] | undefined>('trips', 'readonly', (store) =>
      store.get(tripId),
    );
    return result?.data ?? null;
  },

  async getAllCachedTrips() {
    const db = await openDB();
    return new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.map((r) => r.data));
      request.onerror = () => reject(request.error);
    });
  },

  // Itinerary
  async cacheItinerary(tripId: string, days: unknown[]) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('itinerary', 'readwrite');
      const store = tx.objectStore('itinerary');
      store.put({ id: tripId, tripId, data: days, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getCachedItinerary(tripId: string) {
    const result = await withStore<DBSchema['itinerary'] | undefined>('itinerary', 'readonly', (store) =>
      store.get(tripId),
    );
    return (result?.data as unknown[] | null) ?? null;
  },

  // Sync queue
  async addToSyncQueue(op: Omit<DBSchema['sync_queue'], 'timestamp' | 'retryCount'>) {
    return withStore('sync_queue', 'readwrite', (store) =>
      store.put({ ...op, timestamp: Date.now(), retryCount: 0 }),
    );
  },

  async getSyncQueue() {
    const db = await openDB();
    return new Promise<DBSchema['sync_queue'][]>((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async removeSyncOperation(id: string) {
    return withStore('sync_queue', 'readwrite', (store) => store.delete(id));
  },

  async clearSyncQueue() {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
