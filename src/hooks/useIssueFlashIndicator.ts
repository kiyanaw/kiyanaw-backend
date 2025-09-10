import { useState, useEffect } from 'react';
import { flashIndicatorService, FLASH_CONFIG } from '../services/flashIndicatorService';

interface IssueFlashState {
  username: string;
  isFlashing: boolean;
  opacity: number;
}

/**
 * Hook for managing flash indicator state and animations for a specific issue.
 * 
 * @param issueId - The ID of the issue to listen for flash events
 * @returns Flash state object or null if no flash is active
 */
export const useIssueFlashIndicator = (issueId: string): IssueFlashState | null => {
  const [flashState, setFlashState] = useState<IssueFlashState | null>(null);

  useEffect(() => {
    let fadeTimeout: NodeJS.Timeout;
    let clearStateTimeout: NodeJS.Timeout;

    const unsubscribe = flashIndicatorService.onIssueFlash(issueId, (username) => {
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
      }, FLASH_CONFIG.usernameVisibleDuration); // Stay visible for same duration as wavesurfer username
      
      // Clear flash state completely after visible duration + fade duration
      clearStateTimeout = setTimeout(() => {
        setFlashState(null);
      }, FLASH_CONFIG.usernameVisibleDuration + FLASH_CONFIG.textFadeDuration + 100); // Add small buffer
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
  }, [issueId]);

  return flashState;
};