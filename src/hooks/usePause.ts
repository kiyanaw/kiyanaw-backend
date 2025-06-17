import { useCallback } from 'react';
import { wavesurferService } from '../services/wavesurferService';

export const usePause = () => {
  // not debounced so we can call multiple times
  return useCallback(() => {
    wavesurferService.pause()
  }, []);
}; 
