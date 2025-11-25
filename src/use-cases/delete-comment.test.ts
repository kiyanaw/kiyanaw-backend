import { DeleteCommentUseCase, DeleteCommentInput } from './delete-comment';
import { deleteExistingComment } from '../services/commentService';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { currentUser } from '../services/userService';
import type { CommentData, IssueData } from '../services/adt';

// Mock the services
jest.mock('../services/commentService');
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../services/userService');

const mockDeleteExistingComment = deleteExistingComment as jest.MockedFunction<typeof deleteExistingComment>;
const mockUpdateExistingIssue = updateExistingIssue as jest.MockedFunction<typeof updateExistingIssue>;

describe('DeleteCommentUseCase', () => {
  let useCase: DeleteCommentUseCase;
  let mockEditorStore: any;

  const mockIssueComment: CommentData = {
    id: 'comment-123',
    text: 'Test comment',
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

  const mockRegionComment: CommentData = {
    id: 'comment-456',
    text: 'Region comment',
    author: 'user-123',
    authorFriendly: 'Test User',
    transcriptionId: 'trans-456',
    entityType: 'region',
    entityId: 'region-123',
    parentCommentId: undefined,
    metadata: undefined,
    createdAt: '2023-01-01T12:00:00Z',
    updatedAt: '2023-01-01T12:00:00Z',
    _version: 2
  };

  const mockIssue: IssueData = {
    id: 'issue-789',
    text: 'Test issue',
    type: 'new-word' as const,
    owner: 'user-123',
    ownerFriendly: 'Test User',
    regionId: 'region-123',
    transcriptionId: 'trans-456',
    index: 1,
    resolved: false,
    commentCount: 3,
    dateLastUpdated: '2023-01-01T00:00:00Z',
    userLastUpdated: 'user-123',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _version: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    useCase = new DeleteCommentUseCase();
    
    // Mock currentUser
    (currentUser as jest.Mock).mockReturnValue({
      userId: 'user-123',
      username: 'testuser'
    });

    // Mock editor store
    mockEditorStore = {
      commentById: jest.fn(),
      deleteComment: jest.fn(),
      issueById: jest.fn(),
      commentsByIssue: jest.fn(),
      updateIssue: jest.fn()
    };
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockEditorStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    const validInput: DeleteCommentInput = {
      commentId: 'comment-123'
    };

    it('should delete an issue comment successfully and update count', async () => {
      const remainingComments = [{ id: 'comment-other-1' }, { id: 'comment-other-2' }];
      
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue(remainingComments);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 2, _version: 6 });

      await useCase.execute(validInput);

      // Verify backend deletion
      expect(mockDeleteExistingComment).toHaveBeenCalledWith('comment-123', 3);
      
      // Verify store cleanup
      expect(mockEditorStore.deleteComment).toHaveBeenCalledWith('comment-123');
      
      // Verify issue comment count update
      expect(mockEditorStore.commentsByIssue).toHaveBeenCalledWith('issue-789');
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-789', { commentCount: 2 }, 5, 'testuser');
      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-789', { ...mockIssue, commentCount: 2, _version: 6 });

      expect(console.log).toHaveBeenCalledWith('🗑️ Deleting comment comment-123 (version: 3)');
      expect(console.log).toHaveBeenCalledWith('✅ Comment deleted successfully: comment-123');
    });

    it('should delete a region comment without updating issue count', async () => {
      mockEditorStore.commentById.mockReturnValue(mockRegionComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);

      await useCase.execute({ commentId: 'comment-456' });

      expect(mockDeleteExistingComment).toHaveBeenCalledWith('comment-456', 2);
      expect(mockEditorStore.deleteComment).toHaveBeenCalledWith('comment-456');
      
      // Should not update issue count for region comments
      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
    });

    it('should handle comment not found in store', async () => {
      mockEditorStore.commentById.mockReturnValue(null);

      await useCase.execute(validInput);

      expect(console.warn).toHaveBeenCalledWith('Comment comment-123 not found in store, skipping delete');
      expect(mockDeleteExistingComment).not.toHaveBeenCalled();
      expect(mockEditorStore.deleteComment).not.toHaveBeenCalled();
    });

    it('should handle missing _version gracefully', async () => {
      const commentWithoutVersion = { ...mockIssueComment, _version: undefined };
      mockEditorStore.commentById.mockReturnValue(commentWithoutVersion);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([]);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 0, _version: 6 });

      await useCase.execute(validInput);

      // Should use version 0 as fallback
      expect(mockDeleteExistingComment).toHaveBeenCalledWith('comment-123', 0);
    });

    it('should handle missing issue when updating comment count', async () => {
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockEditorStore.issueById.mockReturnValue(null); // Issue not found

      await useCase.execute(validInput);

      expect(mockEditorStore.deleteComment).toHaveBeenCalledWith('comment-123');
      
      // Should not try to update issue count if issue not found
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
    });

    it('should count remaining comments correctly', async () => {
      const remainingComments = [
        { id: 'comment-1' },
        { id: 'comment-2' },
        { id: 'comment-3' }
      ];
      
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue(remainingComments);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 3, _version: 6 });

      await useCase.execute(validInput);

      // Should count actual remaining comments (3) not decrement from existing count
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-789', { commentCount: 3 }, 5, 'testuser');
    });

    it('should handle zero remaining comments', async () => {
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([]); // No remaining comments
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 0, _version: 6 });

      await useCase.execute(validInput);

      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-789', { commentCount: 0 }, 5, 'testuser');
    });

    it('should handle backend comment count update failure gracefully', async () => {
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([]);
      mockUpdateExistingIssue.mockRejectedValue(new Error('Backend update failed'));

      // Should not throw - gracefully handle the error
      await useCase.execute(validInput);

      expect(mockEditorStore.deleteComment).toHaveBeenCalledWith('comment-123');
      expect(console.error).toHaveBeenCalledWith('Failed to persist issue commentCount after delete:', expect.any(Error));
      expect(console.log).toHaveBeenCalledWith('✅ Comment deleted successfully: comment-123');
    });

    it('should handle backend deletion failure', async () => {
      const backendError = new Error('Backend deletion failed');
      mockEditorStore.commentById.mockReturnValue(mockIssueComment);
      mockDeleteExistingComment.mockRejectedValue(backendError);

      await expect(useCase.execute(validInput)).rejects.toThrow('Backend deletion failed');

      expect(console.error).toHaveBeenCalledWith('Failed to delete comment:', backendError);
      
      // Should not update store if backend deletion failed
      expect(mockEditorStore.deleteComment).not.toHaveBeenCalled();
      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
    });

    it('should handle transcription comments without updating issue count', async () => {
      const transcriptionComment = {
        ...mockIssueComment,
        entityType: 'transcription' as const,
        entityId: 'trans-456'
      };
      
      mockEditorStore.commentById.mockReturnValue(transcriptionComment);
      mockDeleteExistingComment.mockResolvedValue(undefined);

      await useCase.execute(validInput);

      expect(mockDeleteExistingComment).toHaveBeenCalledWith('comment-123', 3);
      expect(mockEditorStore.deleteComment).toHaveBeenCalledWith('comment-123');
      
      // Should not update issue count for transcription comments
      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
    });
  });
});