import { useCallback } from 'react';
import { SelectAndPlayRegion } from '../use-cases/select-and-play-region';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

export const useSelectAndPlayRegion = () => {
  // not debounced so we can call multiple times
  return useCallback((regionId: string) => {
    const store = useEditorStore.getState();
    new SelectAndPlayRegion({ regionId, services, store }).execute();
  }, []);
}; 