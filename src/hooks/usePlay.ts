import { useCallback } from 'react';
import { wavesurferService } from '../services/wavesurferService';

// TODO: is this particular hook overkill?
export const usePlay = () => {
  // not debounced so we can call multiple times
  return useCallback(async (options: { playInFull?: boolean } = {}) => {
    wavesurferService.play(options)
  }, []);
}; 
