import { useCallback } from 'react';
import { CreateIssueFromSelectionUseCase } from '../use-cases/create-issue-from-selection';

export const useCreateIssueFromSelection = () => {
  return useCallback(async () => {
    try {
      const useCase = new CreateIssueFromSelectionUseCase();
      return await useCase.execute();
    } catch (error) {
      console.error('Failed to create issue from selection:', error);
      throw error;
    }
  }, []);
};