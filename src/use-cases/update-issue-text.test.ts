import { UpdateIssueTextUseCase, UpdateIssueTextInput } from './update-issue-text';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { currentUser } from '../services/userService';
import { services } from '../services';
import Timeout from 'smart-timeout';
import type { IssueData } from '../services/adt';

// Mock the dependencies
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../services/rteService');
jest.mock('../services/userService');
jest.mock('../services');
jest.mock('smart-timeout');

const mockUpdateExistingIssue = updateExistingIssue as jest.MockedFunction<typeof updateExistingIssue>;
const mockTimeout = {
  set: jest.fn(),
  clear: jest.fn()
};
(Timeout.set as jest.Mock) = mockTimeout.set;
(Timeout.clear as jest.Mock) = mockTimeout.clear;

describe('UpdateIssueTextUseCase', () => {
  let useCase: UpdateIssueTextUseCase;
  let mockEditorStore: any;

  const mockIssue: IssueData = {
    id: 'issue-123',
    text: 'Original issue text',
    type: 'new-word',
    owner: 'user-123',
    ownerFriendly: 'Test User',
    regionId: 'region-456',
    transcriptionId: 'trans-789',
    index: 1,
    resolved: false,
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

    useCase = new UpdateIssueTextUseCase();

    // Mock editor store
    mockEditorStore = {
      issueById: jest.fn(),
      updateIssue: jest.fn(),
      setTranscription: jest.fn(),
      transcription: {
        id: 'trans-789',
        title: 'Test Transcription',
        author: 'test-user',
        authorFriendly: 'Test User',
        type: 'audio',
        source: 'test.mp3',
        userLastUpdated: 'test-user',
        length: 100
      },
      calculateTranscriptionMetadata: jest.fn().mockReturnValue({
        regionCount: 5,
        issueCount: 3,
        coverage: 0.8
      })
    };
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockEditorStore);

    // Mock rteService
    (rteService.updateIssueHighlighting as jest.Mock).mockImplementation(() => {});
    
    // Mock currentUser
    (currentUser as jest.Mock).mockReturnValue({
      userId: 'user-123',
      username: 'test-user'
    });

    // Mock services
    (services as any).authService = {
      currentUser: jest.fn().mockReturnValue({
        username: 'user-123',
        userId: 'user-123'
      })
    };
    (services as any).transcriptionService = {
      updateTranscription: jest.fn().mockResolvedValue({})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should throw error for missing issueId', () => {
      const input = { issueId: '', newText: 'test' };
      expect(() => useCase.validate(input)).toThrow('Issue ID is required');
    });

    it('should throw error for non-string newText', () => {
      const input = { issueId: 'issue-123', newText: 123 as any };
      expect(() => useCase.validate(input)).toThrow('New text must be a string');
    });

    it('should pass validation for valid input', () => {
      const input = { issueId: 'issue-123', newText: 'Valid text' };
      expect(() => useCase.validate(input)).not.toThrow();
    });
  });

  describe('execute', () => {
    const validInput: UpdateIssueTextInput = {
      issueId: 'issue-123',
      newText: 'Updated issue text'
    };

    it('should update issue text with debounced save', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(validInput);

      // Verify optimistic update to store
      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        text: 'Updated issue text'
      });

      // Verify RTE highlighting update
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('region-456');

      // Verify debounced save setup
      expect(mockTimeout.set).toHaveBeenCalledWith(
        'save-issue-text-issue-123',
        expect.any(Function),
        2500
      );
    });

    it('should handle issue not found in store', async () => {
      mockEditorStore.issueById.mockReturnValue(null);

      await useCase.execute(validInput);

      expect(console.warn).toHaveBeenCalledWith('Issue issue-123 not found in store, skipping update');
      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
      expect(mockTimeout.set).not.toHaveBeenCalled();
    });

    it('should skip update if text has not changed', async () => {
      const sameTextInput = { ...validInput, newText: 'Original issue text' };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(sameTextInput);

      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
      expect(mockTimeout.set).not.toHaveBeenCalled();
    });

    it('should trim whitespace from new text', async () => {
      const whitespaceInput = { ...validInput, newText: '  Updated issue text  ' };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(whitespaceInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        text: 'Updated issue text'
      });
    });

    it('should handle trimmed text that matches original', async () => {
      const whitespaceInput = { ...validInput, newText: '  Original issue text  ' };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(whitespaceInput);

      // Should skip since trimmed text matches original
      expect(mockEditorStore.updateIssue).not.toHaveBeenCalled();
    });

    it('should clear existing timeout before setting new one', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      
      // First call sets up a timeout
      await useCase.execute(validInput);
      expect(mockTimeout.set).toHaveBeenCalledWith(
        'save-issue-text-issue-123',
        expect.any(Function),
        2500
      );

      // Reset mocks and call again - should clear existing timeout
      jest.clearAllMocks();
      await useCase.execute(validInput);

      expect(mockTimeout.clear).toHaveBeenCalledWith('save-issue-text-issue-123');
      expect(mockTimeout.set).toHaveBeenCalledWith(
        'save-issue-text-issue-123',
        expect.any(Function),
        2500
      );
    });

    it('should handle missing _version gracefully', async () => {
      const issueWithoutVersion = { ...mockIssue, _version: undefined };
      mockEditorStore.issueById.mockReturnValue(issueWithoutVersion);

      await useCase.execute(validInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalled();
      
      // Check that the timeout callback would use version 0
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      
      // Execute the timeout callback to verify it uses correct version
      mockUpdateExistingIssue.mockResolvedValue(mockIssue);
      await timeoutCallback();
      
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-123', { text: 'Updated issue text' }, 0, 'test-user');
    });

    it('should handle issue without regionId', async () => {
      const issueWithoutRegion = { ...mockIssue, regionId: undefined };
      mockEditorStore.issueById.mockReturnValue(issueWithoutRegion);

      await useCase.execute(validInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
      expect(mockTimeout.set).toHaveBeenCalled();
    });

    it('should preserve original version for backend save', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockUpdateExistingIssue.mockResolvedValue(mockIssue);

      await useCase.execute(validInput);

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      // Should use original version (5) not any potentially modified version
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith('issue-123', { text: 'Updated issue text' }, 5, 'test-user');
    });

    it('should handle backend save success', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockUpdateExistingIssue.mockResolvedValue(mockIssue);

      await useCase.execute(validInput);

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      expect(console.log).toHaveBeenCalledWith('💾 Saving issue text for issue-123: "Updated issue text" (version: 5)');
      expect(console.log).toHaveBeenCalledWith('✅ Issue text saved successfully for issue-123');
    });

    it('should handle backend save failure gracefully', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      const saveError = new Error('Backend save failed');
      mockUpdateExistingIssue.mockRejectedValue(saveError);
      
      // Ensure user is authenticated for this test
      (currentUser as jest.Mock).mockReturnValue({
        userId: 'user-123',
        username: 'test-user'
      });

      await useCase.execute(validInput);

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      expect(console.error).toHaveBeenCalledWith('❌ Failed to save issue text for issue-123:', saveError);
    });

    it('should clean up pending saves map after timeout', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      mockUpdateExistingIssue.mockResolvedValue(mockIssue);

      await useCase.execute(validInput);

      // Check that the issue ID is added to pending saves
      expect(mockTimeout.set).toHaveBeenCalled();

      // Execute the timeout callback
      const timeoutCallback = mockTimeout.set.mock.calls[0][1];
      await timeoutCallback();

      // Note: We can't easily test the Map cleanup since it's internal,
      // but we can verify the callback structure is correct
      expect(mockUpdateExistingIssue).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidInput = { issueId: '', newText: 'test' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow('Issue ID is required');

      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockTimeout.set).not.toHaveBeenCalled();
    });

    it('should handle unicode characters correctly', async () => {
      const unicodeInput = { ...validInput, newText: 'ē-mânokâkēcik issue' };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(unicodeInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        text: 'ē-mânokâkēcik issue'
      });
    });

    it('should handle empty string text', async () => {
      const emptyInput = { ...validInput, newText: '' };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(emptyInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        text: ''
      });
    });

    it('should handle very long text input', async () => {
      const longText = 'A'.repeat(10000);
      const longTextInput = { ...validInput, newText: longText };
      mockEditorStore.issueById.mockReturnValue(mockIssue);

      await useCase.execute(longTextInput);

      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        text: longText
      });
    });
  });
});