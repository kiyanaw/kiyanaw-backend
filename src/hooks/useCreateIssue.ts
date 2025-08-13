import { useCallback } from 'react';
import { CreateIssueUseCase, type CreateIssueConfig } from '../use-cases/create-issue';
import type { IssueData } from '../services/adt';

export const useCreateIssue = () => {
  return useCallback(async (config: CreateIssueConfig): Promise<IssueData> => {
    const useCase = new CreateIssueUseCase(config);
    return await useCase.execute();
  }, []);
};