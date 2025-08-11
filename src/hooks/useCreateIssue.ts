import { useCallback } from 'react';
import { CreateIssueUseCase, type CreateIssueInput } from '../use-cases/create-issue';
import type { IssueData } from '../services/adt';

const createIssueUseCase = new CreateIssueUseCase();

export const useCreateIssue = () => {
  return useCallback(async (input: CreateIssueInput): Promise<IssueData> => {
    return await createIssueUseCase.execute(input);
  }, []);
};