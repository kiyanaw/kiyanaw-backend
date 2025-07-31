import { useRef } from 'react';

import { services } from '../services';
import { LoadTranscriptions } from '../use-cases/load-transcriptions';
import { useTranscriptionsStore } from '../stores/useTranscriptionsStore';

export const useLoadTranscriptions = (): void => {
  const hasCalledRef = useRef<boolean>(false);
  
  // Only call loadTranscriptions once
  if (!hasCalledRef.current) {
    hasCalledRef.current = true;
    const store = useTranscriptionsStore.getState();
    
    // Set loading state
    store.setLoading(true);
    
    const useCase = new LoadTranscriptions({
      services,
      store,
    });

    useCase.execute().catch((error) => {
      console.error('❌ useLoadTranscriptions failed:', error);
      // Error is already handled in the use-case
    });
  }
}; 