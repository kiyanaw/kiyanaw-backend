import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TranscriptionModel } from '../services/adt';
import { services } from '../services';
import { LoadTranscriptions } from '../use-cases/load-transcriptions';

interface CacheStats {
  count: number;
  lastSyncedAt: string | null;
}

interface TranscriptionsState {
  // Data state
  transcriptions: TranscriptionModel[];
  loading: boolean;
  error: string | null;
  
  // Sync state
  isSyncing: boolean;
  lastSyncedAt: string | null;
  cacheStats: CacheStats | null;
  
  // Tab-specific sync status
  ownedSyncStatus: 'synced' | 'syncing' | null;
  sharedSyncStatus: 'synced' | 'syncing' | null;
  
  // Data actions
  setTranscriptions: (transcriptions: TranscriptionModel[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Sync actions
  setSyncStatus: (syncing: boolean) => void;
  updateCacheStats: (stats: CacheStats) => void;
  mergeTranscriptions: (newTranscriptions: TranscriptionModel[]) => void;
  
  // Media status updates
  applyMediaStatus: (mediaId: string, status: string) => void;

  // Tab-specific sync actions
  setOwnedSyncStatus: (status: 'synced' | 'syncing' | null) => void;
  setSharedSyncStatus: (status: 'synced' | 'syncing' | null) => void;

  // Reset all state (used on logout / account switch)
  reset: () => void;

  // Legacy action
  reload: () => void;
}

export const useTranscriptionsStore = create<TranscriptionsState>()(
  devtools(
    (set, get) => ({
      // Data state
      transcriptions: [],
      loading: false,
      error: null,
      
      // Sync state
      isSyncing: false,
      lastSyncedAt: null,
      cacheStats: null,
      
      // Tab-specific sync status
      ownedSyncStatus: null,
      sharedSyncStatus: null,
      
      // Data actions
      setTranscriptions: (transcriptions: TranscriptionModel[]) => {
        set({ transcriptions, loading: false, error: null });
      },
      setLoading: (loading: boolean) => {
        set({ loading });
      },
      setError: (error: string | null) => {
        set({ error, loading: false });
      },
      
      // Sync actions
      setSyncStatus: (isSyncing: boolean) => {
        set({ isSyncing });
      },
      updateCacheStats: (cacheStats: CacheStats) => {
        set({ cacheStats, lastSyncedAt: cacheStats.lastSyncedAt });
      },
      mergeTranscriptions: (newTranscriptions: TranscriptionModel[]) => {
        const { transcriptions } = get();
        
        // Create a map of existing transcriptions by ID for efficient lookup
        const existingMap = new Map(transcriptions.map(t => [t.id, t]));
        
        // Add or update transcriptions
        newTranscriptions.forEach(newT => {
          existingMap.set(newT.id, newT);
        });
        
        // Convert back to array and sort by dateLastUpdated (newest first)
        const mergedTranscriptions = Array.from(existingMap.values())
          .sort((a, b) => {
            const aDate = a.dateLastUpdated ? new Date(a.dateLastUpdated).getTime() : 0;
            const bDate = b.dateLastUpdated ? new Date(b.dateLastUpdated).getTime() : 0;
            return bDate - aDate;
          });
        
        console.log(`📦 Merged transcriptions: ${transcriptions.length} existing + ${newTranscriptions.length} new = ${mergedTranscriptions.length} total`);
        set({ transcriptions: mergedTranscriptions });
      },
      
      removeTranscription: (transcriptionId: string) => {
        const { transcriptions } = get();
        set({ transcriptions: transcriptions.filter(t => t.id !== transcriptionId) });
      },

      // Media status updates — find the matching transcription and update its mediaStatus
      applyMediaStatus: (mediaId: string, status: string) => {
        const { transcriptions } = get();
        const updated = transcriptions.map(t => {
          if (t.mediaId !== mediaId) return t;
          t.mediaStatus = status;
          return t;
        });
        set({ transcriptions: updated });
      },

      // Tab-specific sync actions
      setOwnedSyncStatus: (ownedSyncStatus: 'synced' | 'syncing' | null) => {
        set({ ownedSyncStatus });
      },
      setSharedSyncStatus: (sharedSyncStatus: 'synced' | 'syncing' | null) => {
        set({ sharedSyncStatus });
      },

      // Reset all state (used on logout / account switch)
      reset: () => {
        set({
          transcriptions: [],
          loading: false,
          error: null,
          isSyncing: false,
          lastSyncedAt: null,
          cacheStats: null,
          ownedSyncStatus: null,
          sharedSyncStatus: null,
        });
      },

      // Legacy action
      reload: () => {
        const store = useTranscriptionsStore.getState();
        store.setLoading(true);
        store.setError(null);
        
        const useCase = new LoadTranscriptions({
          services,
          store,
        });

        useCase.execute().catch((error) => {
          console.error('❌ Store reload failed:', error);
          // Error is already handled in the use-case
        });
      },
    }),
    { name: 'TranscriptionsStore' }
  )
); 