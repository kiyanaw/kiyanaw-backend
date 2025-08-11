import { useCallback } from 'react';
import { DeleteIssueUseCase, type DeleteIssueInput } from '../use-cases/delete-issue';

const deleteIssueUseCase = new DeleteIssueUseCase();

export const useDeleteIssue = () => {
  return useCallback(async (input: DeleteIssueInput): Promise<void> => {
    return await deleteIssueUseCase.execute(input);
  }, []);
};