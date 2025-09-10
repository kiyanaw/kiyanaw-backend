import { useCallback } from 'react';
import { UpdateIssueUseCase, type UpdateIssueConfig } from '../use-cases/update-issue';
import type { IssueData } from '../services/adt';

export const useUpdateIssue = () => {
  return useCallback(async (config: UpdateIssueConfig): Promise<IssueData> => {
    const updateIssueUseCase = new UpdateIssueUseCase(config);
    return await updateIssueUseCase.execute();
  }, []);
};