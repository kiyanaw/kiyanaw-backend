import { useState, useEffect } from 'react';
import { regionSaveManager } from '../services/regionSaveManager';

/**
 * Hook to track if there are any pending region saves.
 * Polls the regionSaveManager at regular intervals.
 *
 * @param active - Whether to actively poll (default: true)
 * @returns boolean indicating if there are pending saves
 */
export const useHasPendingSaves = (active: boolean = true): boolean => {
  const [hasPendingSaves, setHasPendingSaves] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const checkPendingSaves = () => {
      setHasPendingSaves(regionSaveManager.hasAnyPendingSaves());
    };

    checkPendingSaves();
    const interval = setInterval(checkPendingSaves, 500);

    return () => clearInterval(interval);
  }, [active]);

  return hasPendingSaves;
};
