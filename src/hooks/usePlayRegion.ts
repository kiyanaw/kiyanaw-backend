import { useCallback } from 'react';
import { PlayRegion } from '../use-cases/play-region';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

export const usePlayRegion = () => {
  // not debounced so we can call multiple times
  return useCallback((regionId: string) => {
    const store = useEditorStore.getState();
    new PlayRegion({ regionId, services, store }).execute();
  }, []);
}; 
