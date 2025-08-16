import { DeleteIssueUseCase, type DeleteIssueConfig } from './delete-issue';
import { deleteExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { services } from '../services';
import type { IssueData } from '../services/adt';

// Mock the services
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../services/rteService');
jest.mock('../services');

const mockDeleteExistingIssue = deleteExistingIssue as jest.MockedFunction<typeof deleteExistingIssue>;

describe('DeleteIssueUseCase', () => {
  let mockEditorStore: any;

  const mockIssue: IssueData = {
    id: 'issue-123',
    text: 'Test issue text',
    type: 'new-word',
    owner: 'user-123',
    ownerFriendly: 'Test User',
    regionId: 'region-456',
    transcriptionId: 'trans-789',
    index: 1,
    resolved: false,
    commentCount: 2,
    dateLastUpdated: '2023-01-01T00:00:00Z',
    userLastUpdated: 'user-123',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _version: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock editor store
    mockEditorStore = {
      issueById: jest.fn(),
      deleteIssue: jest.fn(),
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

    // Mock deleteExistingIssue
    mockDeleteExistingIssue.mockResolvedValue(undefined);

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

  describe('constructor and config access', () => {
    it('should properly store and access config via constructor', () => {
      const config: DeleteIssueConfig = {
        issueId: 'issue-123'
      };
      
      const useCase = new DeleteIssueUseCase(config);
      
      // Test that validate can access the config
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('validate', () => {
    it('should throw error for missing issueId', () => {
      const config: DeleteIssueConfig = {
        issueId: ''
      };
      const useCase = new DeleteIssueUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Issue ID is required');
    });

    it('should not throw error for valid issueId', () => {
      const config: DeleteIssueConfig = {
        issueId: 'issue-123'
      };
      const useCase = new DeleteIssueUseCase(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should successfully delete issue with all proper calls', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'issue-123' });
      await useCase.execute();

      // Should get issue from store using issueById
      expect(mockEditorStore.issueById).toHaveBeenCalledWith('issue-123');
      
      // Should delete from backend with correct version
      expect(mockDeleteExistingIssue).toHaveBeenCalledWith('issue-123', 5);
      
      // Should remove from store
      expect(mockEditorStore.deleteIssue).toHaveBeenCalledWith('issue-123');
      
      // Should update RTE highlighting for the region
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('region-456');
    });

    it('should handle issue not found in store', async () => {
      mockEditorStore.issueById.mockReturnValue(null);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'nonexistent-issue' });
      
      await expect(useCase.execute()).rejects.toThrow(
        'Issue with ID nonexistent-issue not found'
      );

      // Should not call backend or store operations
      expect(mockDeleteExistingIssue).not.toHaveBeenCalled();
      expect(mockEditorStore.deleteIssue).not.toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
    });

    it('should handle missing _version gracefully', async () => {
      const issueWithoutVersion = { ...mockIssue, _version: undefined };
      mockEditorStore.issueById.mockReturnValue(issueWithoutVersion);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'issue-123' });
      await useCase.execute();

      // Should use version 0 as fallback
      expect(mockDeleteExistingIssue).toHaveBeenCalledWith('issue-123', 0);
      expect(mockEditorStore.deleteIssue).toHaveBeenCalledWith('issue-123');
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('region-456');
    });

    it('should handle backend delete failure', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      const backendError = new Error('Backend deletion failed');
      mockDeleteExistingIssue.mockRejectedValue(backendError);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'issue-123' });
      
      await expect(useCase.execute()).rejects.toThrow('Backend deletion failed');

      // Should have called backend but not store operations on failure
      expect(mockDeleteExistingIssue).toHaveBeenCalledWith('issue-123', 5);
      expect(mockEditorStore.deleteIssue).not.toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
      
      // Should log the error
      expect(console.error).toHaveBeenCalledWith('Failed to delete issue:', backendError);
    });

    it('should handle issue without regionId', async () => {
      const issueWithoutRegion = { ...mockIssue, regionId: undefined as any };
      mockEditorStore.issueById.mockReturnValue(issueWithoutRegion);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'issue-123' });
      await useCase.execute();

      expect(mockDeleteExistingIssue).toHaveBeenCalledWith('issue-123', 5);
      expect(mockEditorStore.deleteIssue).toHaveBeenCalledWith('issue-123');
      
      // Should not update RTE highlighting when no regionId
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
    });

    it('should call validate before executing', async () => {
      mockEditorStore.issueById.mockReturnValue(mockIssue);
      
      const useCase = new DeleteIssueUseCase({ issueId: '' });
      
      await expect(useCase.execute()).rejects.toThrow('Issue ID is required');
      
      // Should not proceed with any operations after validation failure
      expect(mockEditorStore.issueById).not.toHaveBeenCalled();
      expect(mockDeleteExistingIssue).not.toHaveBeenCalled();
    });

    it('should handle null regionId', async () => {
      const issueWithNullRegion = { ...mockIssue, regionId: null as any };
      mockEditorStore.issueById.mockReturnValue(issueWithNullRegion);
      
      const useCase = new DeleteIssueUseCase({ issueId: 'issue-123' });
      await useCase.execute();

      expect(mockDeleteExistingIssue).toHaveBeenCalledWith('issue-123', 5);
      expect(mockEditorStore.deleteIssue).toHaveBeenCalledWith('issue-123');
      
      // Should not update RTE highlighting when regionId is null
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
    });
  });
});

