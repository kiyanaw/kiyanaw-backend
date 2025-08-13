import { UpdateIssueUseCase, type UpdateIssueConfig } from './update-issue';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { currentUser } from '../services/userService';
import type { IssueData } from '../services/adt';

// Mock the services
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../services/rteService');
jest.mock('../services/userService');

const mockUpdateExistingIssue = updateExistingIssue as jest.MockedFunction<typeof updateExistingIssue>;

describe('UpdateIssueUseCase', () => {
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

  const mockUpdatedIssue: IssueData = {
    ...mockIssue,
    resolved: true,
    _version: 6
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock editor store
    mockEditorStore = {
      issueById: jest.fn(),
      updateIssue: jest.fn()
    };
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockEditorStore);

    // Mock rteService
    (rteService.updateIssueHighlighting as jest.Mock).mockImplementation(() => {});
    
    // Mock currentUser
    (currentUser as jest.Mock).mockReturnValue({
      userId: 'user-123',
      username: 'test-user'
    });

    // Mock updateExistingIssue
    mockUpdateExistingIssue.mockResolvedValue(mockUpdatedIssue);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and config access', () => {
    it('should properly store and access config via constructor', () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: { resolved: true }
      };
      
      const useCase = new UpdateIssueUseCase(config);
      
      // Test that validate can access the config
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('validate', () => {
    it('should throw error for missing issueId', () => {
      const config: UpdateIssueConfig = {
        issueId: '',
        updates: { resolved: true }
      };
      const useCase = new UpdateIssueUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Issue ID is required');
    });

    it('should throw error for empty updates', () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: {}
      };
      const useCase = new UpdateIssueUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Updates are required');
    });

    it('should pass validation for valid config', () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: { resolved: true }
      };
      const useCase = new UpdateIssueUseCase(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should update issue successfully with optimistic update', async () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: { resolved: true }
      };
      
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      
      const useCase = new UpdateIssueUseCase(config);
      const result = await useCase.execute();

      // Verify optimistic update to store
      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', {
        ...mockIssue,
        resolved: true
      });

      // Verify RTE highlighting update
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('region-456');

      // Verify backend update
      expect(mockUpdateExistingIssue).toHaveBeenCalledWith(
        'issue-123',
        { resolved: true },
        5,
        'test-user'
      );

      // Verify store update with server response
      expect(mockEditorStore.updateIssue).toHaveBeenCalledWith('issue-123', mockUpdatedIssue);

      expect(result).toBe(mockUpdatedIssue);
    });

    it('should throw error if issue not found in store', async () => {
      const config: UpdateIssueConfig = {
        issueId: 'nonexistent-issue',
        updates: { resolved: true }
      };
      
      mockEditorStore.issueById.mockReturnValue(null);
      
      const useCase = new UpdateIssueUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Issue nonexistent-issue not found');
    });

    it('should throw error if user not authenticated', async () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: { resolved: true }
      };
      
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      (currentUser as jest.Mock).mockReturnValue(null);
      
      const useCase = new UpdateIssueUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('User must be authenticated to update issues');
    });

    it('should handle backend errors gracefully', async () => {
      const config: UpdateIssueConfig = {
        issueId: 'issue-123',
        updates: { resolved: true }
      };
      
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      const backendError = new Error('Backend error');
      mockUpdateExistingIssue.mockRejectedValue(backendError);
      
      const useCase = new UpdateIssueUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Backend error');
      expect(console.error).toHaveBeenCalledWith('Failed to update issue:', backendError);
    });
  });
});
