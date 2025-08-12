import { useCallback } from 'react';
import { UpdateCommentUseCase, type UpdateCommentInput } from '../use-cases/update-comment';

export const useUpdateComment = () => {
  return useCallback(async (input: UpdateCommentInput) => {
    await new UpdateCommentUseCase().execute(input);
  }, []);
};