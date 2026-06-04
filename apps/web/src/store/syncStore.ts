import { create } from 'zustand';
import type { SyncOperation } from '@wanderlog/shared';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: SyncOperation[];
  lastSyncAt: string | null;
  syncError: string | null;

  setOnline: (online: boolean) => void;
  addOperation: (op: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeOperation: (id: string) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  markSynced: () => void;
}

let opCounter = 0;

export const useSyncStore = create<SyncState>()((set) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingOperations: [],
  lastSyncAt: null,
  syncError: null,

  setOnline: (online) => set({ isOnline: online }),

  addOperation: (op) =>
    set((state) => ({
      pendingOperations: [
        ...state.pendingOperations,
        {
          ...op,
          id: `op_${Date.now()}_${opCounter++}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ],
    })),

  removeOperation: (id) =>
    set((state) => ({
      pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
    })),

  setSyncing: (isSyncing) => set({ isSyncing }),

  setSyncError: (syncError) => set({ syncError }),

  markSynced: () =>
    set({ lastSyncAt: new Date().toISOString(), syncError: null, isSyncing: false }),
}));
