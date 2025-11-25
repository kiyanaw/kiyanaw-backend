import type { IssueData } from './adt';

// Mock the entire issueService module to avoid Amplify setup issues
const mockClient = {
  graphql: jest.fn()
};

// Mock AWS Amplify before importing the service
jest.mock('aws-amplify/api', () => ({
  generateClient: () => mockClient
}));

// Mock GraphQL queries/mutations
jest.mock('../graphql/queries.js', () => ({
  listIssues: 'mock-list-issues-query'
}));

jest.mock('../graphql/mutations.js', () => ({
  createIssue: 'mock-create-issue-mutation',
  updateIssue: 'mock-update-issue-mutation',
  deleteIssue: 'mock-delete-issue-mutation'
}));

// Import the services after mocking
import { 
  loadIssuesForTranscription, 
  createIssueForRegion, 
  updateExistingIssue, 
  deleteExistingIssue 
} from './issueService';

describe('issueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadIssuesForTranscription', () => {
    const transcriptionId = 'trans-123';
    const mockIssues: IssueData[] = [
      {
        id: 'issue-1',
        text: 'First issue',
        type: 'new-word' as const,
        owner: 'user-1',
        ownerFriendly: 'User One',
        regionId: 'region-1',
        transcriptionId,
        index: 1,
        resolved: false,
        dateLastUpdated: '2023-01-02T00:00:00Z',
        userLastUpdated: 'user-1',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        _version: 1
      },
      {
        id: 'issue-2',
        text: 'Second issue',
        type: 'new-word' as const,
        owner: 'user-2',
        ownerFriendly: 'User Two',
        regionId: 'region-2',
        transcriptionId,
        index: 2,
        resolved: true,
        dateLastUpdated: '2023-01-01T00:00:00Z',
        userLastUpdated: 'user-2',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        _version: 1
      }
    ];

    it('should load and sort issues by creation date (newest first)', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          listIssues: {
            items: mockIssues
          }
        }
      });

      const result = await loadIssuesForTranscription(transcriptionId);

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: 'mock-list-issues-query',
        variables: {
          filter: { 
            transcriptionId: { eq: transcriptionId },
            _deleted: { ne: true }
          },
          limit: 2000
        }
      });

      expect(result).toHaveLength(2);
      // Should be sorted newest first (issue-1 is newer than issue-2)
      expect(result[0].id).toBe('issue-1');
      expect(result[1].id).toBe('issue-2');
      expect(console.debug).toHaveBeenCalledWith(`🔍 Loading issues for transcription ${transcriptionId} via GraphQL...`);
      expect(console.debug).toHaveBeenCalledWith(`📊 Found 2 issues for transcription ${transcriptionId}`);
    });

    it('should handle empty results', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          listIssues: {
            items: []
          }
        }
      });

      const result = await loadIssuesForTranscription(transcriptionId);

      expect(result).toEqual([]);
      expect(console.debug).toHaveBeenCalledWith(`📊 Found 0 issues for transcription ${transcriptionId}`);
    });

    it('should handle missing data structure', async () => {
      mockClient.graphql.mockResolvedValue({
        data: null
      });

      const result = await loadIssuesForTranscription(transcriptionId);

      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors gracefully', async () => {
      const error = new Error('GraphQL network error');
      mockClient.graphql.mockRejectedValue(error);

      const result = await loadIssuesForTranscription(transcriptionId);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('❌ Failed to load issues via GraphQL:', error);
    });

    it('should sort issues with missing createdAt dates', async () => {
      const issuesWithMissingDates = [
        { ...mockIssues[0], createdAt: undefined },
        { ...mockIssues[1], createdAt: '2023-01-01T00:00:00Z' }
      ];

      mockClient.graphql.mockResolvedValue({
        data: {
          listIssues: {
            items: issuesWithMissingDates
          }
        }
      });

      const result = await loadIssuesForTranscription(transcriptionId);

      expect(result).toHaveLength(2);
      // Issue with valid date should come first
      expect(result[0].createdAt).toBe('2023-01-01T00:00:00Z');
      expect(result[1].createdAt).toBeUndefined();
    });
  });

  describe('createIssueForRegion', () => {
    const issueData = {
      text: 'New test issue',
      type: 'new-word' as const,
      owner: 'user-123',
      ownerFriendly: 'Test User',
      regionId: 'region-456',
      transcriptionId: 'trans-789'
    };

    const mockCreatedIssue: IssueData = {
      id: 'new-issue-id',
      ...issueData,
      ownerFriendly: 'Test User',
      index: 1,
      resolved: false,
      dateLastUpdated: '2023-01-01T00:00:00Z',
      userLastUpdated: 'test-user',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      _version: 1
    };

    it('should create a new issue successfully', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          createIssue: mockCreatedIssue
        }
      });

      const result = await createIssueForRegion(issueData, 'test-user');

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: 'mock-create-issue-mutation',
        variables: {
          input: {
            ...issueData,
            resolved: false,
            index: 0,
            dateLastUpdated: expect.any(String),
            userLastUpdated: 'test-user'
          }
        }
      });

      expect(result).toEqual(mockCreatedIssue);
      expect(console.debug).toHaveBeenCalledWith('🔨 Creating new issue via GraphQL...');
      expect(console.info).toHaveBeenCalledWith('✅ Issue created successfully');
    });

    it('should handle GraphQL errors', async () => {
      const error = new Error('Create issue failed');
      mockClient.graphql.mockRejectedValue(error);

      await expect(createIssueForRegion(issueData, 'test-user')).rejects.toThrow('Create issue failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to create issue:', error);
    });
  });

  describe('updateExistingIssue', () => {
    const issueId = 'issue-123';
    const version = 5;
    const updates = {
      text: 'Updated issue text',
      resolved: true,
      type: 'new-word' as const,
      // Read-only fields that should be filtered out
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      __typename: 'Issue'
    };

    const mockUpdatedIssue: IssueData = {
      id: issueId,
      text: 'Updated issue text',
      type: 'new-word' as const,
      owner: 'user-1',
      ownerFriendly: 'User One',
      regionId: 'region-1',
      transcriptionId: 'trans-1',
      index: 1,
      resolved: true,
      dateLastUpdated: '2023-01-02T00:00:00Z',
      userLastUpdated: 'test-user',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      _version: 6
    };

    it('should update an issue successfully', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          updateIssue: mockUpdatedIssue
        }
      });

      const result = await updateExistingIssue(issueId, updates, version, 'test-user');

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: 'mock-update-issue-mutation',
        variables: {
          input: {
            id: issueId,
            _version: version,
            text: 'Updated issue text',
            resolved: true,
            type: 'new-word' as const,
            dateLastUpdated: expect.any(String),
            userLastUpdated: 'test-user'
            // createdAt, updatedAt, __typename should be filtered out
          }
        }
      });

      expect(result).toEqual(mockUpdatedIssue);
      expect(console.debug).toHaveBeenCalledWith(`🔧 Updating issue ${issueId} via GraphQL...`);
      expect(console.info).toHaveBeenCalledWith('✅ Issue updated successfully');
    });

    it('should filter out read-only fields', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { updateIssue: mockUpdatedIssue }
      });

      await updateExistingIssue(issueId, updates, version, 'test-user');

      const calledWith = mockClient.graphql.mock.calls[0][0];
      const input = calledWith.variables.input;

      expect(input).not.toHaveProperty('createdAt');
      expect(input).not.toHaveProperty('updatedAt');
      expect(input).not.toHaveProperty('__typename');
      expect(input).toHaveProperty('_version', version);
    });

    it('should handle partial updates', async () => {
      const partialUpdates = { resolved: true };
      mockClient.graphql.mockResolvedValue({
        data: { updateIssue: mockUpdatedIssue }
      });

      await updateExistingIssue(issueId, partialUpdates, version, 'test-user');

      const calledWith = mockClient.graphql.mock.calls[0][0];
      const input = calledWith.variables.input;

      expect(input).toEqual({
        id: issueId,
        _version: version,
        resolved: true,
        dateLastUpdated: expect.any(String),
        userLastUpdated: 'test-user'
      });
    });

    it('should handle GraphQL errors', async () => {
      const error = new Error('Update issue failed');
      mockClient.graphql.mockRejectedValue(error);

      await expect(updateExistingIssue(issueId, updates, version, 'test-user')).rejects.toThrow('Update issue failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to update issue:', error);
    });
  });

  describe('deleteExistingIssue', () => {
    const issueId = 'issue-to-delete';
    const version = 3;

    it('should delete an issue successfully', async () => {
      mockClient.graphql.mockResolvedValue({});

      await deleteExistingIssue(issueId, version);

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: 'mock-delete-issue-mutation',
        variables: {
          input: { 
            id: issueId,
            _version: version
          }
        }
      });

      expect(console.debug).toHaveBeenCalledWith(`🗑️ Deleting issue ${issueId} via GraphQL...`);
      expect(console.info).toHaveBeenCalledWith('✅ Issue deleted successfully');
    });

    it('should handle GraphQL errors', async () => {
      const error = new Error('Delete issue failed');
      mockClient.graphql.mockRejectedValue(error);

      await expect(deleteExistingIssue(issueId, version)).rejects.toThrow('Delete issue failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to delete issue:', error);
    });
  });
});