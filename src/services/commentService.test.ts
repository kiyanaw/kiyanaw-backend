import { loadCommentsForTranscription, __resetClient } from './commentService';
import { generateClient } from 'aws-amplify/api';
import type { CommentData } from './adt';

// Mock the dependencies
jest.mock('aws-amplify/api');

describe('CommentService', () => {
  const mockGenerateClient = generateClient as jest.MockedFunction<typeof generateClient>;

  const mockGraphqlClient = {
    graphql: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();
    mockGenerateClient.mockReturnValue(mockGraphqlClient as any);
  });

  describe('loadCommentsForTranscription', () => {
    it('should call GraphQL with correct parameters', async () => {
      const transcriptionId = 'test-transcription';
      const mockComments: CommentData[] = [
        {
          id: 'comment-1',
          text: 'First comment',
          author: 'user-1',
          authorFriendly: 'User One',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          transcriptionId,
          entityType: 'region',
          entityId: 'region-1',
          _version: 1,
        },
        {
          id: 'comment-2',
          text: 'Second comment',
          author: 'user-2',
          authorFriendly: 'User Two',
          createdAt: '2023-12-02T10:00:00Z',
          updatedAt: '2023-12-02T10:00:00Z',
          transcriptionId,
          entityType: 'issue',
          entityId: 'issue-1',
          _version: 1,
        },
      ];

      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: mockComments,
          },
        },
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: {
          filter: { transcriptionId: { eq: transcriptionId } },
          limit: 2000,
        },
      });

      // Should return comments sorted by creation date (newest first)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('comment-2'); // 2023-12-02 (newer)
      expect(result[1].id).toBe('comment-1'); // 2023-12-01 (older)
    });

    it('should handle empty results', async () => {
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: [],
          },
        },
      });

      const result = await loadCommentsForTranscription('test-id');

      expect(result).toEqual([]);
    });

    it('should handle missing data gracefully', async () => {
      mockGraphqlClient.graphql.mockResolvedValue({
        data: null,
      });

      const result = await loadCommentsForTranscription('test-id');

      expect(result).toEqual([]);
    });

    it('should handle missing listComments gracefully', async () => {
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listComments: null,
        },
      });

      const result = await loadCommentsForTranscription('test-id');

      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors gracefully', async () => {
      const error = new Error('GraphQL failed');
      mockGraphqlClient.graphql.mockRejectedValue(error);

      // Should not throw, but return empty array
      const result = await loadCommentsForTranscription('test-id');

      expect(result).toEqual([]);
    });

    it('should sort comments by creation date correctly', async () => {
      const transcriptionId = 'test-transcription';
      const mockComments: CommentData[] = [
        {
          id: 'comment-oldest',
          text: 'Oldest comment',
          author: 'user-1',
          authorFriendly: 'User One',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          transcriptionId,
          entityType: 'region',
          entityId: 'region-1',
          _version: 1,
        },
        {
          id: 'comment-newest',
          text: 'Newest comment',
          author: 'user-3',
          authorFriendly: 'User Three',
          createdAt: '2023-12-03T10:00:00Z',
          updatedAt: '2023-12-03T10:00:00Z',
          transcriptionId,
          entityType: 'transcription',
          entityId: transcriptionId,
          _version: 1,
        },
        {
          id: 'comment-middle',
          text: 'Middle comment',
          author: 'user-2',
          authorFriendly: 'User Two',
          createdAt: '2023-12-02T10:00:00Z',
          updatedAt: '2023-12-02T10:00:00Z',
          transcriptionId,
          entityType: 'issue',
          entityId: 'issue-1',
          _version: 1,
        },
      ];

      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: mockComments, // Intentionally in random order
          },
        },
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      // Should be sorted newest first
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('comment-newest');  // 2023-12-03
      expect(result[1].id).toBe('comment-middle');  // 2023-12-02
      expect(result[2].id).toBe('comment-oldest');  // 2023-12-01
    });

    it('should handle comments without createdAt timestamp', async () => {
      const transcriptionId = 'test-transcription';
      const mockComments = [
        {
          id: 'comment-with-date',
          text: 'Comment with date',
          author: 'user-1',
          authorFriendly: 'User One',
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
          transcriptionId,
          entityType: 'region',
          entityId: 'region-1',
          _version: 1,
        },
        {
          id: 'comment-without-date',
          text: 'Comment without date',
          author: 'user-2',
          authorFriendly: 'User Two',
          // No createdAt field
          updatedAt: '2023-12-01T10:00:00Z',
          transcriptionId,
          entityType: 'region',
          entityId: 'region-2',
          _version: 1,
        },
      ];

      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: mockComments,
          },
        },
      });

      // Should not throw an error
      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toHaveLength(2);
      // Comment with date should come first (higher timestamp)
      expect(result[0].id).toBe('comment-with-date');
      expect(result[1].id).toBe('comment-without-date');
    });
  });
});