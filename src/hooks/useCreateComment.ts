import { useCallback } from 'react';
import { CreateCommentUseCase, type CreateCommentInput } from '../use-cases/create-comment';

export const useCreateComment = () => {
  return useCallback(async (input: CreateCommentInput) => {
    await new CreateCommentUseCase().execute(input);
  }, []);
};