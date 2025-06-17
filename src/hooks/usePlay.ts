import { useCallback } from 'react';
import { wavesurferService } from '../services/wavesurferService';

export const usePlay = () => {
  // not debounced so we can call multiple times
  return useCallback(async () => {
    wavesurferService.play()
  }, []);
}; 
