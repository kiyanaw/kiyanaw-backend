import { useCallback } from 'react';
import { DeleteTranscriptionUseCase, type DeleteTranscriptionConfig, type DeleteTranscriptionResult } from '../use-cases/delete-transcription';

export interface UseDeleteTranscriptionOptions {
  onSuccess?: (result: DeleteTranscriptionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for deleting transcriptions
 * Pure-callback hook - returns memoized callback with no React effects
 */
export const useDeleteTranscription = (options?: UseDeleteTranscriptionOptions) => {
  return useCallback(async (config: Omit<DeleteTranscriptionConfig, 'currentUserId'>): Promise<DeleteTranscriptionResult> => {
    try {
      const useCase = new DeleteTranscriptionUseCase(config);
      const result = await useCase.execute();
      
      // Call success callback if provided
      options?.onSuccess?.(result);
      
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Call error callback if provided
      options?.onError?.(errorObj);
      
      // Re-throw so the component can handle it
      throw errorObj;
    }
  }, [options]);
};
