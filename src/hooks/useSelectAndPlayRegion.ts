import { useCallback, useRef } from 'react';
import { SelectAndPlayRegion } from '../use-cases/select-and-play-region';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

export const useSelectAndPlayRegion = () => {
  // Add debouncing to prevent rapid region switching that can cause race conditions
  const lastCallTimeRef = useRef<number>(0);
  const pendingCallRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 100; // Small debounce to prevent rapid clicks
  
  return useCallback((regionId: string) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    
    // Clear any pending call
    if (pendingCallRef.current) {
      clearTimeout(pendingCallRef.current);
      pendingCallRef.current = null;
    }
    
    // If it's been long enough since the last call, execute immediately
    if (timeSinceLastCall >= DEBOUNCE_MS) {
      lastCallTimeRef.current = now;
      const store = useEditorStore.getState();
      new SelectAndPlayRegion({ regionId, services, store }).execute();
    } else {
      // Otherwise, schedule the call
      pendingCallRef.current = setTimeout(() => {
        lastCallTimeRef.current = Date.now();
        const store = useEditorStore.getState();
        new SelectAndPlayRegion({ regionId, services, store }).execute();
        pendingCallRef.current = null;
      }, DEBOUNCE_MS - timeSinceLastCall);
    }
  }, []);
}; 