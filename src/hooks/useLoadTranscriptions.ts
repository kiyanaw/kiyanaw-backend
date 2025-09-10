import { useCallback, useRef } from 'react';

import { services } from '../services';
import { LoadTranscriptions } from '../use-cases/load-transcriptions';
import { useTranscriptionsStore } from '../stores/useTranscriptionsStore';

/**
 * Hook for loading transcriptions with two-stage loading (cache first, then sync)
 * Returns a callback function to trigger loading
 */
export const useLoadTranscriptions = () => {
  const hasCalledRef = useRef<boolean>(false);
  
  return useCallback(() => {
    // Only call loadTranscriptions once per component lifecycle
    if (!hasCalledRef.current) {
      hasCalledRef.current = true;
      const store = useTranscriptionsStore.getState();
      
      // Set initial loading state (will be cleared by cache load)
      store.setLoading(true);
      
      const useCase = new LoadTranscriptions({
        services,
        store,
      });

      // Fire and forget - let use-case handle the orchestration
      useCase.execute().catch((error) => {
        console.error('❌ useLoadTranscriptions failed:', error);
      });
    }
  }, []);
};

/**
 * Hook for accessing transcription sync status
 */
export const useTranscriptionSyncStatus = () => {
  const isSyncing = useTranscriptionsStore(state => state.isSyncing);
  const lastSyncedAt = useTranscriptionsStore(state => state.lastSyncedAt);
  const cacheStats = useTranscriptionsStore(state => state.cacheStats);
  const ownedSyncStatus = useTranscriptionsStore(state => state.ownedSyncStatus);
  const sharedSyncStatus = useTranscriptionsStore(state => state.sharedSyncStatus);
  
  return { 
    isSyncing, 
    lastSyncedAt, 
    cacheStats,
    ownedSyncStatus,
    sharedSyncStatus,
    hasCachedData: (cacheStats?.count || 0) > 0
  };
}; 