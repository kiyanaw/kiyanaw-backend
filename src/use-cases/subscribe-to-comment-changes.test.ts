import { SubscribeToCommentChangesUseCase } from './subscribe-to-comment-changes';
import type { CommentSubscriptionEvent } from '../services/commentService';
import type { CommentData, IssueData } from '../services/adt';
import Timeout from 'smart-timeout';

// Mock smart-timeout
jest.mock('smart-timeout');
const mockTimeout = {
  set: jest.fn(),
  clear: jest.fn()
};
(Timeout.set as jest.Mock) = mockTimeout.set;
(Timeout.clear as jest.Mock) = mockTimeout.clear;

// Mock services
const mockServices = {
  commentService: {
    subscribeToCommentChanges: jest.fn(),
  },
  userService: {
    currentUser: jest.fn(),
  },
  storeService: {
    addNewComment: jest.fn(),
    deleteComment: jest.fn(),
    issueById: jest.fn(),
    regionById: jest.fn(),
    getIssuesForRegion: jest.fn(),
  },
  flashIndicatorService: {
    flashIssue: jest.fn(),
  },
  rteService: {
    hasEditor: jest.fn(),
    queueHighlightingUpdate: jest.fn(),
  },
};

// Mock issueHighlightService
jest.mock('../services/issueHighlightService', () => ({
  issueHighlightService: {
    convertIssuesToHighlights: jest.fn().mockReturnValue([]),
  },
}));

describe('SubscribeToCommentChangesUseCase', () => {
  let useCase: SubscribeToCommentChangesUseCase;
  let mockUnsubscribe: jest.Mock;

  const mockComment: CommentData = {
    id: 'comment-123',
    text: 'Test comment',
    author: 'user-456',
    authorFriendly: 'Test User',
    createdAt: '2023-01-01T12:00:00Z',
    updatedAt: '2023-01-01T12:00:00Z',
    transcriptionId: 'transcription-789',
    entityType: 'issue',
    entityId: 'issue-123',
    _version: 1,
  };

  const mockIssue: IssueData = {
    id: 'issue-123',
    text: 'Test issue',
    owner: 'user-456',
    ownerFriendly: 'Test User',
    index: 1,
    resolved: false,
    type: 'needs-help' as const,
    regionId: 'region-456',
    transcriptionId: 'transcription-789',
    dateLastUpdated: '2023-01-01T00:00:00Z',
    userLastUpdated: 'user-456',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _version: 1,
  };

  const mockRegion = {
    id: 'region-456',
    start: 0,
    end: 10,
    regionText: 'Test region text',
    regionAnalysis: [
      { word: 'test', analysis: 'test+N', allAnalysis: ['test+N'] },
      { word: 'region', analysis: 'region+N', allAnalysis: ['region+N'] }
    ],
    transcriptionId: 'transcription-789',
    _version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    mockServices.commentService.subscribeToCommentChanges.mockReturnValue(mockUnsubscribe);

    useCase = new SubscribeToCommentChangesUseCase({
      transcriptionId: 'transcription-789',
      services: mockServices as any,
    });
  });

  describe('validate', () => {
    it('should throw error if transcriptionId is empty', () => {
      const useCaseWithEmptyId = new SubscribeToCommentChangesUseCase({
        transcriptionId: '',
        services: mockServices as any,
      });

      expect(() => useCaseWithEmptyId.validate()).toThrow('transcriptionId is required');
    });

    it('should throw error if transcriptionId is whitespace', () => {
      const useCaseWithWhitespace = new SubscribeToCommentChangesUseCase({
        transcriptionId: '   ',
        services: mockServices as any,
      });

      expect(() => useCaseWithWhitespace.validate()).toThrow('transcriptionId is required');
    });

    it('should not throw error for valid transcriptionId', () => {
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should call commentService.subscribeToCommentChanges with correct parameters', () => {
      const unsubscribe = useCase.execute();

      expect(mockServices.commentService.subscribeToCommentChanges).toHaveBeenCalledWith(
        'transcription-789',
        expect.any(Function)
      );
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should validate before executing', () => {
      const validateSpy = jest.spyOn(useCase, 'validate');
      useCase.execute();

      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('handleCommentSubscriptionEvent', () => {
    beforeEach(() => {
      mockServices.userService.currentUser.mockReturnValue({
        userId: 'other-user',
        username: 'other@example.com',
      });
    });

    it('should skip self-triggered events', async () => {
      mockServices.userService.currentUser.mockReturnValue({
        userId: 'user-456',
        username: 'user@example.com',
      });

      const event: CommentSubscriptionEvent = {
        mutation: 'CREATE',
        comment: mockComment,
      };

      await useCase.handleCommentSubscriptionEvent(event);

      expect(mockServices.storeService.addNewComment).not.toHaveBeenCalled();
      expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
    });

    describe('CREATE events', () => {
      it('should add comment to store and flash issue for issue comments', async () => {
        mockServices.storeService.issueById.mockReturnValue(mockIssue);
        mockServices.storeService.regionById.mockReturnValue(mockRegion);
        mockServices.storeService.getIssuesForRegion.mockReturnValue([mockIssue]);

        const event: CommentSubscriptionEvent = {
          mutation: 'CREATE',
          comment: mockComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.addNewComment).toHaveBeenCalledWith(mockComment);
        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          'issue-123',
          'region-456',
          'Test User'
        );
      });

      it('should handle CREATE for unknown issue gracefully', async () => {
        mockServices.storeService.issueById.mockReturnValue(null);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const event: CommentSubscriptionEvent = {
          mutation: 'CREATE',
          comment: mockComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.addNewComment).toHaveBeenCalledWith(mockComment);
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('🔌 Comment CREATE for unknown issue:', 'issue-123');

        consoleSpy.mockRestore();
      });

      it('should ignore non-issue comments', async () => {
        const regionComment = { ...mockComment, entityType: 'region' as const };
        const event: CommentSubscriptionEvent = {
          mutation: 'CREATE',
          comment: regionComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.addNewComment).toHaveBeenCalledWith(regionComment);
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
      });
    });

    describe('DELETE events', () => {
      it('should delete comment from store, flash issue, and refresh RTE for issue comments', async () => {
        mockServices.storeService.issueById.mockReturnValue(mockIssue);
        mockServices.storeService.regionById.mockReturnValue(mockRegion);
        mockServices.storeService.getIssuesForRegion.mockReturnValue([mockIssue]);

        const event: CommentSubscriptionEvent = {
          mutation: 'DELETE',
          comment: mockComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.deleteComment).toHaveBeenCalledWith('comment-123');
        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          mockIssue.id,
          mockIssue.regionId,
          mockComment.authorFriendly
        );
      });

      it('should handle DELETE for unknown issue gracefully', async () => {
        mockServices.storeService.issueById.mockReturnValue(null);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const event: CommentSubscriptionEvent = {
          mutation: 'DELETE',
          comment: mockComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.deleteComment).toHaveBeenCalledWith('comment-123');
        expect(consoleSpy).toHaveBeenCalledWith('🔌 Comment DELETE for unknown issue:', 'issue-123');

        consoleSpy.mockRestore();
      });

      it('should ignore non-issue comments', async () => {
        const regionComment = { ...mockComment, entityType: 'region' as const };
        const event: CommentSubscriptionEvent = {
          mutation: 'DELETE',
          comment: regionComment,
        };

        await useCase.handleCommentSubscriptionEvent(event);

        expect(mockServices.storeService.deleteComment).toHaveBeenCalledWith('comment-123');
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
      });
    });

    it('should handle unknown mutation types gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = {
        mutation: 'UPDATE' as any,
        comment: mockComment,
      };

      await useCase.handleCommentSubscriptionEvent(event);

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Unknown comment mutation type:', 'UPDATE');

      consoleSpy.mockRestore();
    });
  });

  describe('refreshRteHighlightingForRegion', () => {
    beforeEach(() => {
      mockServices.storeService.regionById.mockReturnValue(mockRegion);
      mockServices.storeService.getIssuesForRegion.mockReturnValue([mockIssue]);
      mockServices.rteService.hasEditor.mockReturnValue(true);
      mockTimeout.set.mockReturnValue('timeout-id');
      mockTimeout.clear.mockImplementation();
    });

    it('should debounce RTE refresh calls', async () => {
      mockServices.storeService.issueById.mockReturnValue(mockIssue);

      const event: CommentSubscriptionEvent = {
        mutation: 'CREATE',
        comment: mockComment,
      };

      await useCase.handleCommentSubscriptionEvent(event);

      expect(mockTimeout.set).toHaveBeenCalledWith(
        'rte-refresh-region-456',
        expect.any(Function),
        200
      );
    });

    it('should clear existing timeout when called multiple times for same region', async () => {
      mockServices.storeService.issueById.mockReturnValue(mockIssue);

      const event: CommentSubscriptionEvent = {
        mutation: 'CREATE',
        comment: mockComment,
      };

      // First call
      await useCase.handleCommentSubscriptionEvent(event);

      // Second call should clear previous timeout
      await useCase.handleCommentSubscriptionEvent(event);

      expect(mockTimeout.clear).toHaveBeenCalledWith('timeout-id');
    });

    it('should apply highlighting when RTE editors exist', async () => {
      mockServices.storeService.issueById.mockReturnValue(mockIssue);

      const event: CommentSubscriptionEvent = {
        mutation: 'CREATE',
        comment: mockComment,
      };

      await useCase.handleCommentSubscriptionEvent(event);

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-456:main');
      expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-456:translation');
      expect(mockServices.rteService.queueHighlightingUpdate).toHaveBeenCalledWith(
        'region-456:main',
        {
          knownWords: ['test', 'region'],
          issues: []
        }
      );
    });



    it('should handle unknown region gracefully', async () => {
      mockServices.storeService.issueById.mockReturnValue(mockIssue);
      mockServices.storeService.regionById.mockReturnValue(null);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event: CommentSubscriptionEvent = {
        mutation: 'CREATE',
        comment: mockComment,
      };

      await useCase.handleCommentSubscriptionEvent(event);

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Cannot refresh highlighting for unknown region:', 'region-456');

      consoleSpy.mockRestore();
    });
  });
});
