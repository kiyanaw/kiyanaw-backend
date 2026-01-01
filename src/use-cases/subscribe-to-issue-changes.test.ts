import { SubscribeToIssueChangesUseCase } from './subscribe-to-issue-changes';
import type { IssueData } from '../services/adt';
import type { RegionData } from '../types/shared';

// Mock issue data with version for subscription events
const mockIssue: IssueData = {
  id: 'issue-1',
  text: 'Test issue',
  type: 'needs-help' as const,
  owner: 'user-123',
  ownerFriendly: 'Test User',
  resolved: false,
  regionId: 'region-1',
  transcriptionId: 'transcription-1',
  commentCount: 0,
  index: 1,
  dateLastUpdated: '2023-01-01T00:00:00.000Z',
  userLastUpdated: 'remote-user', // Different from current user for remote events
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  _version: 1 // Always include version for subscription events
};

const mockRegion: RegionData = {
  id: 'region-1',
  start: 0,
  end: 10,
  regionText: 'test text',
  regionAnalysis: [
    { word: 'test', analysis: 'test+N', allAnalysis: ['test+N'] },
    { word: 'text', analysis: 'text+N', allAnalysis: ['text+N'] }
  ],
  translation: '',
  transcriptionId: 'transcription-1',
  isNote: false,
  dateLastUpdated: '2023-01-01',
  userLastUpdated: 'test-user',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  _version: 1
};

const mockServices = {
  issueService: {
    subscribeToIssueChanges: jest.fn()
  },
  storeService: {
    addNewIssue: jest.fn(),
    updateIssue: jest.fn(),
    deleteIssue: jest.fn(),
    regionById: jest.fn(),
    issueById: jest.fn(),
    getIssuesForRegion: jest.fn()
  },
  rteService: {
    hasEditor: jest.fn(),
    applyHighlighting: jest.fn(),
  },
  userService: {
    currentUser: jest.fn()
  },
  flashIndicatorService: {
    flashIssue: jest.fn()
  }
};

describe('SubscribeToIssueChangesUseCase', () => {
  let useCase: SubscribeToIssueChangesUseCase;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    useCase = new SubscribeToIssueChangesUseCase({
      transcriptionId: 'transcription-1',
      services: mockServices as any
    });

    mockUnsubscribe = jest.fn();
    mockServices.issueService.subscribeToIssueChanges.mockReturnValue(mockUnsubscribe);
    
    // Default mock returns
    mockServices.storeService.regionById.mockReturnValue(mockRegion);
    mockServices.storeService.getIssuesForRegion.mockReturnValue([]);
    mockServices.rteService.hasEditor.mockReturnValue(true);
    mockServices.userService.currentUser.mockReturnValue({
      userId: 'different-user',
      username: 'different-user'
    });
  });

  describe('validation', () => {
    it('should throw error if transcriptionId is empty', () => {
      const useCaseWithEmptyId = new SubscribeToIssueChangesUseCase({
        transcriptionId: '',
        services: mockServices as any
      });

      expect(() => useCaseWithEmptyId.validate()).toThrow('transcriptionId is required');
    });

    it('should throw error if transcriptionId is just whitespace', () => {
      const useCaseWithWhitespace = new SubscribeToIssueChangesUseCase({
        transcriptionId: '   ',
        services: mockServices as any
      });

      expect(() => useCaseWithWhitespace.validate()).toThrow('transcriptionId is required');
    });

    it('should not throw if transcriptionId is valid', () => {
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should set up subscription with correct transcriptionId', async () => {
      const result = useCase.execute();

      expect(mockServices.issueService.subscribeToIssueChanges).toHaveBeenCalledWith(
        'transcription-1',
        expect.any(Function)
      );
    });

    it('should return unsubscribe function', async () => {
      const result = useCase.execute();

      expect(result).toBe(mockUnsubscribe);
    });
  });

  describe('handleIssueSubscriptionEvent', () => {
    let subscriptionCallback: (event: any) => void;

    beforeEach(() => {
      useCase.execute();
      subscriptionCallback = mockServices.issueService.subscribeToIssueChanges.mock.calls[0][1];
    });

    describe('CREATE events', () => {
      it('should add new issue to store and refresh highlighting', async () => {
        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.addNewIssue).toHaveBeenCalledWith(mockIssue);
        expect(mockServices.storeService.regionById).toHaveBeenCalledWith('region-1');
        expect(mockServices.storeService.getIssuesForRegion).toHaveBeenCalledWith('region-1');
        expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:main');
        expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:translation');
      });

      it('should trigger flash indicator for remote CREATE events', async () => {
        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          'issue-1',
          'region-1', 
          'Test User'
        );
      });

      it('should skip self-triggered CREATE events using userLastUpdated', async () => {
        const selfTriggeredIssue = {
          ...mockIssue,
          userLastUpdated: 'user-123' // Same as current user's username
        };

        mockServices.userService.currentUser.mockReturnValue({
          userId: 'user-123',
          username: 'user-123'
        });

        const event = {
          mutation: 'CREATE' as const,
          issue: selfTriggeredIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.addNewIssue).not.toHaveBeenCalled();
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
      });
    });

    describe('UPDATE events', () => {
      it('should update issue with only mutable fields and refresh highlighting', async () => {
        const updatedIssue = {
          ...mockIssue,
          text: 'Updated text',
          resolved: true,
          commentCount: 5,
          _version: 2
        };

        const event = {
          mutation: 'UPDATE' as const,
          issue: updatedIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.updateIssue).toHaveBeenCalledWith('issue-1', {
          text: 'Updated text',
          type: 'needs-help' as const,
          resolved: true,
          commentCount: 5,
          ownerFriendly: 'Test User',
          _version: 2
        });
        expect(mockServices.storeService.regionById).toHaveBeenCalledWith('region-1');
      });

      it('should trigger flash indicator for remote UPDATE events', async () => {
        const event = {
          mutation: 'UPDATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          'issue-1',
          'region-1', 
          'Test User'
        );
      });

      it('should skip self-triggered UPDATE events', async () => {
        const selfTriggeredIssue = {
          ...mockIssue,
          userLastUpdated: 'user-123' // Same as current user's username
        };

        mockServices.userService.currentUser.mockReturnValue({
          userId: 'user-123',
          username: 'user-123'
        });

        const event = {
          mutation: 'UPDATE' as const,
          issue: selfTriggeredIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.updateIssue).not.toHaveBeenCalled();
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
      });

      it('should not trigger flash for commentCount-only updates', async () => {
        const currentIssue = { ...mockIssue, commentCount: 5 };
        const updatedIssue = { ...mockIssue, commentCount: 6 }; // Only commentCount changed
        
        mockServices.storeService.issueById.mockReturnValue(currentIssue);
        mockServices.userService.currentUser.mockReturnValue({ userId: 'other-user' });

        const event = {
          mutation: 'UPDATE' as const,
          issue: updatedIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
        expect(mockServices.storeService.updateIssue).toHaveBeenCalledWith(updatedIssue.id, {
          text: updatedIssue.text,
          type: updatedIssue.type,
          resolved: updatedIssue.resolved,
          commentCount: updatedIssue.commentCount,
          ownerFriendly: updatedIssue.ownerFriendly,
          _version: updatedIssue._version
        });
      });

      it('should trigger flash for significant field updates', async () => {
        const currentIssue = { ...mockIssue, text: 'old text' };
        const updatedIssue = { ...mockIssue, text: 'new text' }; // Text changed
        
        mockServices.storeService.issueById.mockReturnValue(currentIssue);
        mockServices.userService.currentUser.mockReturnValue({ userId: 'other-user' });

        const event = {
          mutation: 'UPDATE' as const,
          issue: updatedIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          updatedIssue.id,
          updatedIssue.regionId,
          updatedIssue.ownerFriendly
        );
      });

      it('should trigger flash when current issue is not found', async () => {
        const updatedIssue = { ...mockIssue, commentCount: 6 };
        
        mockServices.storeService.issueById.mockReturnValue(null); // Issue not found
        mockServices.userService.currentUser.mockReturnValue({ userId: 'other-user' });

        const event = {
          mutation: 'UPDATE' as const,
          issue: updatedIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          updatedIssue.id,
          updatedIssue.regionId,
          updatedIssue.ownerFriendly
        );
      });
    });

    describe('DELETE events', () => {
      it('should delete issue from store and refresh highlighting', async () => {
        const event = {
          mutation: 'DELETE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.deleteIssue).toHaveBeenCalledWith('issue-1');
        expect(mockServices.storeService.regionById).toHaveBeenCalledWith('region-1');
      });

      it('should trigger flash indicator for remote DELETE events', async () => {
        const event = {
          mutation: 'DELETE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashIssue).toHaveBeenCalledWith(
          'issue-1',
          'region-1', 
          'Test User'
        );
      });

      it('should skip self-triggered DELETE events', async () => {
        const selfTriggeredIssue = {
          ...mockIssue,
          userLastUpdated: 'user-123' // Same as current user's username
        };

        mockServices.userService.currentUser.mockReturnValue({
          userId: 'user-123',
          username: 'user-123'
        });

        const event = {
          mutation: 'DELETE' as const,
          issue: selfTriggeredIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.deleteIssue).not.toHaveBeenCalled();
        expect(mockServices.flashIndicatorService.flashIssue).not.toHaveBeenCalled();
      });
    });

    describe('RTE highlighting refresh', () => {
      it('should use applyHighlighting when available', async () => {
        const mockIssues = [mockIssue];
        mockServices.storeService.getIssuesForRegion.mockReturnValue(mockIssues);

        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:main', {
          knownWords: ['test', 'text'],
          issues: expect.any(Array)
        });
        expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:translation', {
          knownWords: ['test', 'text'],
          issues: expect.any(Array)
        });
      });



      it('should skip highlighting refresh if editors do not exist', async () => {
        mockServices.rteService.hasEditor.mockReturnValue(false);

        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        // Should not call any highlighting methods
        expect(mockServices.rteService.applyHighlighting).not.toHaveBeenCalled();
      });

      it('should handle missing region gracefully', async () => {
        mockServices.storeService.regionById.mockReturnValue(null);

        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        // Should still call addNewIssue but skip highlighting
        expect(mockServices.storeService.addNewIssue).toHaveBeenCalledWith(mockIssue);
        expect(mockServices.rteService.applyHighlighting).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle unknown mutation types gracefully', async () => {
        const event = {
          mutation: 'UNKNOWN' as any,
          issue: mockIssue
        };

        // Should not throw
        await expect(subscriptionCallback(event)).resolves.not.toThrow();

        // Should not call any store methods
        expect(mockServices.storeService.addNewIssue).not.toHaveBeenCalled();
        expect(mockServices.storeService.updateIssue).not.toHaveBeenCalled();
        expect(mockServices.storeService.deleteIssue).not.toHaveBeenCalled();
      });

      it('should handle null current user', async () => {
        mockServices.userService.currentUser.mockReturnValue(null);

        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        // Should proceed with processing since it's not self-triggered
        expect(mockServices.storeService.addNewIssue).toHaveBeenCalledWith(mockIssue);
      });

      it('should handle region with empty regionAnalysis', async () => {
        const regionWithoutAnalysis = { ...mockRegion, regionAnalysis: undefined };
        mockServices.storeService.regionById.mockReturnValue(regionWithoutAnalysis);

        const event = {
          mutation: 'CREATE' as const,
          issue: mockIssue
        };

        await subscriptionCallback(event);

        expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:main', {
          knownWords: [],
          issues: expect.any(Array)
        });
      });
    });
  });

  describe('cleanup', () => {
    it('should call unsubscribe when returned function is called', () => {
      const unsubscribe = useCase.execute();
      
      unsubscribe!();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});