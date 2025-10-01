import { useCallback } from 'react';
import type { SearchResult } from '../services/adt';
import { SearchDatabaseUseCase } from '../use-cases/search-database';

/**
 * Pure callback hook for searching the database
 * No useEffect - components call this imperatively
 */
export const useDatabaseSearch = () => {
  return useCallback(async (query: string, lang?: string): Promise<SearchResult[]> => {
    const useCase = new SearchDatabaseUseCase({ query, lang });
    return await useCase.execute();
  }, []);
};
