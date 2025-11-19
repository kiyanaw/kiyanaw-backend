import { useCallback } from 'react';
import type { Attestation } from '../services/adt';
import { SearchDatabaseUseCase } from '../use-cases/search-database';

/**
 * Pure callback hook for searching the database
 * Returns attestations (text examples) instead of aggregated results
 * No useEffect - components call this imperatively
 */
export const useDatabaseSearch = () => {
  return useCallback(async (query: string, lang?: string, page?: number, limit?: number): Promise<Attestation[]> => {
    const useCase = new SearchDatabaseUseCase({ query, lang, page, limit });
    return await useCase.execute();
  }, []);
};
