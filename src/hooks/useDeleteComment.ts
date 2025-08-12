import { useCallback } from 'react';
import { DeleteCommentUseCase, type DeleteCommentInput } from '../use-cases/delete-comment';

export const useDeleteComment = () => {
  return useCallback(async (input: DeleteCommentInput) => {
    await new DeleteCommentUseCase().execute(input);
  }, []);
};