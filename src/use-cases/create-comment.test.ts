import { CreateCommentUseCase, CreateCommentInput } from './create-comment';
import { createNewComment } from '../services/commentService';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuthStore } from '../stores/useAuthStore';
import { currentUser } from '../services/userService';
import type { CommentData, IssueData } from '../services/adt';

// Mock the services
jest.mock('../services/commentService');
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../stores/useAuthStore');
jest.mock('../services/userService');

const mockCreateNewComment = createNewComment as jest.MockedFunction<typeof createNewComment>;
const mockUpdateExistingIssue = updateExistingIssue as jest.MockedFunction<typeof updateExistingIssue>;

describe('CreateCommentUseCase', () => {
  let useCase: CreateCommentUseCase;
  let mockAuthStore: any;
  let mockEditorStore: any;

  const mockUser = {
    userId: 'user-123',
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockTranscription = {
    id: 'trans-456',
    title: 'Test Transcription',
    author: 'user-123'
  };

  const mockIssue: IssueData = {
    id: 'issue-789',
    text: 'Test issue',
    type: 'new-word',
    owner: 'user-123',
    ownerFriendly: 'Test User',
    regionId: 'region-123',
    transcriptionId: 'trans-456',
    index: 1,
    resolved: false,
    commentCount: 2,
    dateLastUpdated: '2023-01-01T00:00:00Z',
    userLastUpdated: 'user-123',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _version: 5
  };

  const mockCreatedComment: CommentData = {
    id: 'comment-new',
    text: 'Test comment text',
    author: 'user-123',
    authorFriendly: 'testuser',
    transcriptionId: 'trans-456',
    entityType: 'issue',
    entityId: 'issue-789',
    parentCommentId: undefined,
    metadata: undefined,
    createdAt: '2023-01-01T12:00:00Z',
    updatedAt: '2023-01-01T12:00:00Z',
    _version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    useCase = new CreateCommentUseCase();
    
    // Mock currentUser
    (currentUser as jest.Mock).mockReturnValue({
      userId: 'user-123',
      username: 'testuser'
    });

    // Mock auth store
    mockAuthStore = {
      user: mockUser
    };
    (useAuthStore.getState as jest.Mock).mockReturnValue(mockAuthStore);

    // Mock editor store
    mockEditorStore = {
      transcription: mockTranscription,
      addNewComment: jest.fn(),
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
    const validInput: CreateCommentInput = {
      entityType: 'issue',
      entityId: 'issue-789',
      text: 'Test comment text'
    };

    it('should create a comment successfully', async () => {
      mockCreateNewComment.mockResolvedValue(mockCreatedComment);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([mockCreatedComment, {}]);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 2, _version: 6 });

      await useCase.execute(validInput);

      // Verify comment service was called correctly
      expect(mockCreateNewComment).toHaveBeenCalledWith({
        text: 'Test comment text',
        author: 'user-123',
        authorFriendly: 'testuser',
        transcriptionId: 'trans-456',
        entityType: 'issue',
        entityId: 'issue-789',
        metadata: undefined
      });

      // Verify comment was added to store
      expect(mockEditorStore.addNewComment).toHaveBeenCalledWith(mockCreatedComment);

      // Verify issue commentCount was updated
      expect(mockEditorStore.commentsByIssue).toHaveBeenCalledWith('issue-789');
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-789', { commentCount: 2 }, 5, 'testuser');
      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-789', { ...mockIssue, commentCount: 2, _version: 6 });

      expect(console.log).toHaveBeenCalledWith('✅ Comment created for issue issue-789');
    });

    it('should handle region comments without updating issue count', async () => {
      const regionInput: CreateCommentInput = {
        entityType: 'region',
        entityId: 'region-123',
        text: 'Region comment'
      };

      const regionComment = { ...mockCreatedComment, entityType: 'region' as const, entityId: 'region-123' };
      mockCreateNewComment.mockResolvedValue(regionComment);

      await useCase.execute(regionInput);

      expect(mockCreateNewComment).toHaveBeenCalledWith({
        text: 'Region comment',
        author: 'user-123',
        authorFriendly: 'testuser',
        transcriptionId: 'trans-456',
        entityType: 'region',
        entityId: 'region-123',
        metadata: undefined
      });

      expect(mockEditorStore.addNewComment).toHaveBeenCalledWith(regionComment);
      
      // Should not update issue count for region comments
      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
    });

    it('should handle transcription comments without updating issue count', async () => {
      const transcriptionInput: CreateCommentInput = {
        entityType: 'transcription',
        entityId: 'trans-456',
        text: 'Transcription comment'
      };

      const transcriptionComment = { ...mockCreatedComment, entityType: 'transcription' as const, entityId: 'trans-456' };
      mockCreateNewComment.mockResolvedValue(transcriptionComment);

      await useCase.execute(transcriptionInput);

      expect(mockCreateNewComment).toHaveBeenCalledWith({
        text: 'Transcription comment',
        author: 'user-123',
        authorFriendly: 'testuser',
        transcriptionId: 'trans-456',
        entityType: 'transcription',
        entityId: 'trans-456',
        metadata: undefined
      });

      expect(mockEditorStore.addNewComment).toHaveBeenCalledWith(transcriptionComment);
      
      // Should not update issue count for transcription comments
      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      mockAuthStore.user = null;

      await expect(useCase.execute(validInput)).rejects.toThrow('User must be authenticated to create comments');
      
      expect(mockCreateNewComment).not.toHaveBeenCalled();
      expect(mockEditorStore.addNewComment).not.toHaveBeenCalled();
    });

    it('should throw error when transcription is not loaded', async () => {
      mockEditorStore.transcription = null;

      await expect(useCase.execute(validInput)).rejects.toThrow('Transcription must be loaded to create comments');
      
      expect(mockCreateNewComment).not.toHaveBeenCalled();
      expect(mockEditorStore.addNewComment).not.toHaveBeenCalled();
    });

    it('should throw error when comment text is empty', async () => {
      const emptyInput = { ...validInput, text: '   ' };

      await expect(useCase.execute(emptyInput)).rejects.toThrow('Comment text cannot be empty');
      
      expect(mockCreateNewComment).not.toHaveBeenCalled();
      expect(mockEditorStore.addNewComment).not.toHaveBeenCalled();
    });

    it('should trim whitespace from comment text', async () => {
      const inputWithWhitespace = { ...validInput, text: '  Test comment text  ' };
      mockCreateNewComment.mockResolvedValue(mockCreatedComment);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([mockCreatedComment]);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, _version: 6 });

      await useCase.execute(inputWithWhitespace);

      expect(mockCreateNewComment).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test comment text' // Should be trimmed
        })
      );
    });

    it('should handle missing issue when updating comment count', async () => {
      mockCreateNewComment.mockResolvedValue(mockCreatedComment);
      mockEditorStore.issueById.mockReturnValue(null); // Issue not found

      await useCase.execute(validInput);

      expect(mockEditorStore.addNewComment).toHaveBeenCalledWith(mockCreatedComment);
      
      // Should not try to update issue count if issue not found
      expect(mockUpdateExistingIssue).not.toHaveBeenCalled();
      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
    });

    it('should handle backend comment count update failure gracefully', async () => {
      mockCreateNewComment.mockResolvedValue(mockCreatedComment);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue([mockCreatedComment, {}]);
      mockUpdateExistingIssue.mockRejectedValue(new Error('Backend update failed'));

      // Should not throw - gracefully handle the error
      await useCase.execute(validInput);

      expect(mockEditorStore.addNewComment).toHaveBeenCalledWith(mockCreatedComment);
      expect(console.error).toHaveBeenCalledWith('Failed to persist issue commentCount:', expect.any(Error));
    });

    it('should count actual comments correctly', async () => {
      const existingComments = [
        { id: 'comment-1' },
        { id: 'comment-2' },
        mockCreatedComment // This will be the new comment added by store
      ];
      
      mockCreateNewComment.mockResolvedValue(mockCreatedComment);
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockEditorStore.commentsByIssue.mockReturnValue(existingComments);
      mockUpdateExistingIssue.mockResolvedValue({ ...mockIssue, commentCount: 3, _version: 6 });

      await useCase.execute(validInput);

      // Should count actual comments (3) not increment from existing count
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-789', { commentCount: 3 }, 5, 'testuser');
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Service error');
      mockCreateNewComment.mockRejectedValue(serviceError);

      await expect(useCase.execute(validInput)).rejects.toThrow('Service error');
      
      expect(console.error).toHaveBeenCalledWith('Failed to create comment:', serviceError);
      expect(mockEditorStore.addNewComment).not.toHaveBeenCalled();
    });
  });
});