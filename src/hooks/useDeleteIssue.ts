import { useCallback } from 'react';
import { DeleteIssueUseCase, type DeleteIssueConfig } from '../use-cases/delete-issue';

export const useDeleteIssue = () => {
  return useCallback(async (config: DeleteIssueConfig): Promise<void> => {
    const useCase = new DeleteIssueUseCase(config);
    return await useCase.execute();
  }, []);
};