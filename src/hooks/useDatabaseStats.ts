import { useCallback } from 'react';
import type { DatabaseStats } from '../services/adt';
import { LoadDatabaseStatsUseCase } from '../use-cases/load-database-stats';

/**
 * Pure callback hook for loading database statistics
 * No useEffect - components call this imperatively
 */
export const useDatabaseStats = () => {
  return useCallback(async (lang?: string): Promise<DatabaseStats> => {
    const useCase = new LoadDatabaseStatsUseCase({ lang });
    return await useCase.execute();
  }, []);
};
