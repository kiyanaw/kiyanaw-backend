import { useCallback } from 'react';
import type { Attestation } from '../services/adt';
import { LoadAttestationsUseCase } from '../use-cases/load-attestations';

/**
 * Pure callback hook for loading attestations
 * No useEffect - components call this imperatively
 */
export const useAttestations = () => {
  return useCallback(async (lemma: string, surface: string, lang?: string): Promise<Attestation[]> => {
    const useCase = new LoadAttestationsUseCase({ lemma, surface, lang });
    return await useCase.execute();
  }, []);
};
