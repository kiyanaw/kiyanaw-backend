import { useCallback } from 'react';
import type { LemmaDetails } from '../services/adt';
import { LoadLemmaDetailsUseCase } from '../use-cases/load-lemma-details';

/**
 * Pure callback hook for loading lemma details
 * No useEffect - components call this imperatively
 */
export const useLemmaDetails = () => {
  return useCallback(async (lemma: string, lang?: string): Promise<LemmaDetails> => {
    const useCase = new LoadLemmaDetailsUseCase({ lemma, lang });
    return await useCase.execute();
  }, []);
};
