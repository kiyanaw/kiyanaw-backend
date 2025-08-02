import { useState, useEffect } from 'react';
import { flashIndicatorService } from '../services/flashIndicatorService';

interface FlashState {
  username: string;
  isFlashing: boolean;
  opacity: number;
}

/**
 * Hook for managing flash indicator state and animations for a specific region.
 * 
 * @param regionId - The ID of the region to listen for flash events
 * @returns Flash state object or null if no flash is active
 */
export const useFlashIndicator = (regionId: string): FlashState | null => {
  const [flashState, setFlashState] = useState<FlashState | null>(null);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout;
    let clearStateTimeout: NodeJS.Timeout;

    const unsubscribe = flashIndicatorService.onFlash(regionId, (username) => {
      // Clear any existing timeouts to restart the fade cycle
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
      if (clearStateTimeout) {
        clearTimeout(clearStateTimeout);
      }

      // Set initial bright flash state (or reset to bright if already fading)
      setFlashState({
        username,
        isFlashing: true,
        opacity: 1
      });

      // Start fade immediately with CSS transition (5 seconds)
      fadeTimeout = setTimeout(() => {
        setFlashState(prev => prev ? { ...prev, isFlashing: false, opacity: 0 } : null);
      }, 50); // Small delay to ensure initial state is rendered
      
      // Clear flash state completely after fade duration
      clearStateTimeout = setTimeout(() => {
        setFlashState(null);
      }, 5500); // 5s fade + 0.5s buffer
    });

    return () => {
      unsubscribe();
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
      if (clearStateTimeout) {
        clearTimeout(clearStateTimeout);
      }
    };
  }, [regionId]);

  return flashState;
}; 