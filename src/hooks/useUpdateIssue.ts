import { useCallback } from 'react';
import { UpdateIssueUseCase, type UpdateIssueInput } from '../use-cases/update-issue';
import type { IssueData } from '../services/adt';

const updateIssueUseCase = new UpdateIssueUseCase();

export const useUpdateIssue = () => {
  return useCallback(async (input: UpdateIssueInput): Promise<IssueData> => {
    return await updateIssueUseCase.execute(input);
  }, []);
};