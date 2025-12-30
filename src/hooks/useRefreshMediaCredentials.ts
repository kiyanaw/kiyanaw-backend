import { useCallback, useState } from 'react';
import { services } from '../services';
import { RefreshMediaCredentials } from '../use-cases/refresh-media-credentials';

interface RefreshMediaCredentialsResult {
  refreshCredentials: (source: string, peaks: unknown) => Promise<void>;
  isRefreshing: boolean;
  error: Error | null;
}

/**
 * Hook to refresh media credentials in-place without page reload.
 * Provides loading state for UI feedback.
 */
export const useRefreshMediaCredentials = (): RefreshMediaCredentialsResult => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshCredentials = useCallback(async (source: string, peaks: unknown): Promise<void> => {
    setIsRefreshing(true);
    setError(null);

    try {
      const useCase = new RefreshMediaCredentials({
        source,
        peaks,
        services,
      });
      await useCase.execute();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh credentials');
      setError(error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { refreshCredentials, isRefreshing, error };
};
