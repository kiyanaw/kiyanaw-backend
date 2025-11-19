import { useCallback } from 'react';
import type { SearchResponse } from '../services/adt';
import { SearchDatabaseUseCase } from '../use-cases/search-database';

/**
 * Pure callback hook for searching the database
 * Returns paginated attestations (text examples) with total count
 * No useEffect - components call this imperatively
 */
export const useDatabaseSearch = () => {
  return useCallback(async (query: string, lang?: string, page?: number, limit?: number): Promise<SearchResponse> => {
    const useCase = new SearchDatabaseUseCase({ query, lang, page, limit });
    return await useCase.execute();
  }, []);
};
