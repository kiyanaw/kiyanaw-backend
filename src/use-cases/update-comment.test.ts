import { UpdateCommentUseCase, UpdateCommentInput } from './update-comment';
import { updateExistingComment } from '../services/commentService';
import { useEditorStore } from '../stores/useEditorStore';
import type { CommentData } from '../services/adt';

// Mock the services
jest.mock('../services/commentService');
jest.mock('../stores/useEditorStore');

const mockUpdateExistingComment = updateExistingComment as jest.MockedFunction<typeof updateExistingComment>;

describe('UpdateCommentUseCase', () => {
  let useCase: UpdateCommentUseCase;
  let mockEditorStore: any;

  const mockComment: CommentData = {
    id: 'comment-123',
    text: 'Original comment text',
    author: 'user-123',
    authorFriendly: 'Test User',
    transcriptionId: 'trans-456',
    entityType: 'issue',
    entityId: 'issue-789',
    parentCommentId: undefined,
    metadata: undefined,
    createdAt: '2023-01-01T12:00:00Z',
    updatedAt: '2023-01-01T12:00:00Z',
    _version: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    useCase = new UpdateCommentUseCase();

    // Mock editor store
    mockEditorStore = {
      commentById: jest.fn(),
      updateComment: jest.fn()
    };
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockEditorStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    const validInput: UpdateCommentInput = {
      commentId: 'comment-123',
      text: 'Updated comment text'
    };

    it('should update a comment successfully', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      await useCase.execute(validInput);

      // Verify optimistic update to store
      expect(mockEditorStore.updateComment).toHaveBeenCalledWith('comment-123', {
        ...mockComment,
        text: 'Updated comment text'
      });

      // Verify backend update
      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'Updated comment text' }, 3);

      expect(console.log).toHaveBeenCalledWith('💾 Updating comment comment-123: "Updated comment text" (version: 3)');
      expect(console.log).toHaveBeenCalledWith('✅ Comment updated successfully: comment-123');
    });

    it('should handle comment not found in store', async () => {
      mockEditorStore.commentById.mockReturnValue(null);

      await useCase.execute(validInput);

      expect(console.warn).toHaveBeenCalledWith('Comment comment-123 not found in store, skipping update');
      expect(mockEditorStore.updateComment).not.toHaveBeenCalled();
      expect(mockUpdateExistingComment).not.toHaveBeenCalled();
    });

    it('should throw error for empty text', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);

      const emptyInput = { ...validInput, text: '   ' };

      await expect(useCase.execute(emptyInput)).rejects.toThrow('Comment text cannot be empty');

      expect(mockEditorStore.updateComment).not.toHaveBeenCalled();
      expect(mockUpdateExistingComment).not.toHaveBeenCalled();
    });

    it('should skip update if text has not changed', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);

      const sameTextInput = { ...validInput, text: 'Original comment text' };

      await useCase.execute(sameTextInput);

      expect(mockEditorStore.updateComment).not.toHaveBeenCalled();
      expect(mockUpdateExistingComment).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should trim whitespace from input text', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      const whitespaceInput = { ...validInput, text: '  Updated comment text  ' };

      await useCase.execute(whitespaceInput);

      expect(mockEditorStore.updateComment).toHaveBeenCalledWith('comment-123', {
        ...mockComment,
        text: 'Updated comment text'
      });

      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'Updated comment text' }, 3);
    });

    it('should handle trimmed text that matches original', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);

      const whitespaceInput = { ...validInput, text: '  Original comment text  ' };

      await useCase.execute(whitespaceInput);

      // Should skip since trimmed text matches original
      expect(mockEditorStore.updateComment).not.toHaveBeenCalled();
      expect(mockUpdateExistingComment).not.toHaveBeenCalled();
    });

    it('should handle missing _version gracefully', async () => {
      const commentWithoutVersion = { ...mockComment, _version: undefined };
      mockEditorStore.commentById.mockReturnValue(commentWithoutVersion);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      await useCase.execute(validInput);

      // Should use version 0 as fallback
      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'Updated comment text' }, 0);
    });

    it('should handle backend update failure', async () => {
      const backendError = new Error('Backend update failed');
      mockEditorStore.commentById.mockReturnValue(mockComment);
      mockUpdateExistingComment.mockRejectedValue(backendError);

      await expect(useCase.execute(validInput)).rejects.toThrow('Backend update failed');

      // Optimistic update should still happen
      expect(mockEditorStore.updateComment).toHaveBeenCalledWith('comment-123', {
        ...mockComment,
        text: 'Updated comment text'
      });

      expect(console.error).toHaveBeenCalledWith('❌ Failed to update comment comment-123:', backendError);
      expect(console.error).toHaveBeenCalledWith('Failed to update comment:', backendError);
    });

    it('should preserve original version for backend call despite optimistic updates', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      await useCase.execute(validInput);

      // Should use original version (3) not any potentially modified version from optimistic update
      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'Updated comment text' }, 3);
    });

    it('should handle various input edge cases', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      // Test with newlines and special characters
      const specialTextInput = { ...validInput, text: '  Line 1\nLine 2\t  ' };
      const specialUpdatedComment = { ...mockComment, text: 'Line 1\nLine 2' };
      mockUpdateExistingComment.mockResolvedValue(specialUpdatedComment);

      await useCase.execute(specialTextInput);

      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'Line 1\nLine 2' }, 3);
    });

    it('should handle unicode characters correctly', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      const unicodeInput = { ...validInput, text: 'ē-mânokâkēcik comment' };
      const unicodeUpdatedComment = { ...mockComment, text: 'ē-mânokâkēcik comment' };
      mockUpdateExistingComment.mockResolvedValue(unicodeUpdatedComment);

      await useCase.execute(unicodeInput);

      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: 'ē-mânokâkēcik comment' }, 3);
    });

    it('should handle very long text input', async () => {
      mockEditorStore.commentById.mockReturnValue(mockComment);
      const updatedComment = { ...mockComment, text: 'Updated comment text' };
      mockUpdateExistingComment.mockResolvedValue(updatedComment);

      const longText = 'A'.repeat(10000);
      const longTextInput = { ...validInput, text: longText };
      const longTextUpdatedComment = { ...mockComment, text: longText };
      mockUpdateExistingComment.mockResolvedValue(longTextUpdatedComment);

      await useCase.execute(longTextInput);

      expect(mockUpdateExistingComment).toHaveBeenCalledWith('comment-123', { text: longText }, 3);
    });
  });
});