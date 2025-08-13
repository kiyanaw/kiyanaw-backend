import { subscribeToCommentChanges, loadCommentsForTranscription, __resetClient } from './commentService';
import { generateClient } from 'aws-amplify/api';
import { onCreateComment, onDeleteComment } from '../graphql/subscriptions.js';
import { listComments } from '../graphql/queries.js';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
jest.mock('../graphql/subscriptions.js', () => ({
  onCreateComment: 'mock-onCreateComment-query',
  onDeleteComment: 'mock-onDeleteComment-query',
}));
jest.mock('../graphql/queries.js', () => ({
  listComments: 'mock-listComments-query',
}));

const mockGenerateClient = generateClient as jest.MockedFunction<typeof generateClient>;

describe('commentService subscriptions', () => {
  let mockClient: any;
  let mockCreateSubscription: any;
  let mockDeleteSubscription: any;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();

    // Mock subscription objects with subscribe method
    mockCreateSubscription = {
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    };
    mockDeleteSubscription = {
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    };

    // Mock GraphQL client
    mockClient = {
      graphql: jest.fn().mockImplementation((params: any) => {
        if (params.query === onCreateComment) {
          return mockCreateSubscription;
        } else if (params.query === onDeleteComment) {
          return mockDeleteSubscription;
        }
        return mockCreateSubscription; // fallback
      }),
    };

    mockGenerateClient.mockReturnValue(mockClient as any);
  });

  describe('subscribeToCommentChanges', () => {
    it('should set up subscriptions for CREATE and DELETE events', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();

      const unsubscribe = subscribeToCommentChanges(transcriptionId, onEvent);

      // Should have called graphql twice (CREATE and DELETE)
      expect(mockClient.graphql).toHaveBeenCalledTimes(2);

      // Check CREATE subscription
      expect(mockClient.graphql).toHaveBeenNthCalledWith(1, {
        query: onCreateComment,
        variables: {
          filter: {
            transcriptionId: { eq: transcriptionId },
            _deleted: { ne: true }
          }
        }
      });

      // Check DELETE subscription
      expect(mockClient.graphql).toHaveBeenNthCalledWith(2, {
        query: onDeleteComment,
        variables: {
          filter: {
            transcriptionId: { eq: transcriptionId }
          }
        }
      });

      // Should return unsubscribe function
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle CREATE subscription events', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();
      const mockComment = {
        id: 'comment-123',
        text: 'Test comment',
        author: 'user-456',
        authorFriendly: 'Test User',
        entityType: 'issue',
        entityId: 'issue-789',
        transcriptionId,
      };

      // Mock subscription to capture the next callback
      let createCallback: any;
      mockCreateSubscription.subscribe.mockImplementation((callbacks: any) => {
        createCallback = callbacks.next;
        return { unsubscribe: jest.fn() };
      });

      subscribeToCommentChanges(transcriptionId, onEvent);

      // Simulate subscription event
      createCallback({
        data: {
          onCreateComment: mockComment
        }
      });

      expect(onEvent).toHaveBeenCalledWith({
        mutation: 'CREATE',
        comment: mockComment
      });
    });

    it('should handle DELETE subscription events', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();
      const mockComment = {
        id: 'comment-123',
        text: 'Test comment',
        author: 'user-456',
        authorFriendly: 'Test User',
        entityType: 'issue',
        entityId: 'issue-789',
        transcriptionId,
      };

      // Mock subscription to capture the next callback
      let deleteCallback: any;
      mockDeleteSubscription.subscribe.mockImplementation((callbacks: any) => {
        deleteCallback = callbacks.next;
        return { unsubscribe: jest.fn() };
      });

      subscribeToCommentChanges(transcriptionId, onEvent);

      // Simulate subscription event
      deleteCallback({
        data: {
          onDeleteComment: mockComment
        }
      });

      expect(onEvent).toHaveBeenCalledWith({
        mutation: 'DELETE',
        comment: mockComment
      });
    });

    it('should handle subscription errors gracefully', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock subscription to capture error callback
      let errorCallback: any;
      mockCreateSubscription.subscribe.mockImplementation((callbacks: any) => {
        errorCallback = callbacks.error;
        return { unsubscribe: jest.fn() };
      });

      subscribeToCommentChanges(transcriptionId, onEvent);

      // Simulate subscription error
      const testError = new Error('Subscription failed');
      errorCallback(testError);

      expect(consoleSpy).toHaveBeenCalledWith('Create comment subscription error:', testError);

      consoleSpy.mockRestore();
    });

    it('should unsubscribe from all subscriptions when unsubscribe is called', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();

      const unsubscribe = subscribeToCommentChanges(transcriptionId, onEvent);
      unsubscribe();

      // Should have called subscribe on both subscription objects
      expect(mockCreateSubscription.subscribe).toHaveBeenCalledTimes(1);
      expect(mockDeleteSubscription.subscribe).toHaveBeenCalledTimes(1);
      
      // Should have called unsubscribe on the returned subscription objects
      const createUnsubscribe = mockCreateSubscription.subscribe.mock.results[0].value.unsubscribe;
      const deleteUnsubscribe = mockDeleteSubscription.subscribe.mock.results[0].value.unsubscribe;
      expect(createUnsubscribe).toHaveBeenCalledTimes(1);
      expect(deleteUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe errors gracefully', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock unsubscribe to throw error
      const mockUnsubscribe = jest.fn().mockImplementation(() => {
        throw new Error('Unsubscribe failed');
      });
      mockCreateSubscription.subscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });

      const unsubscribe = subscribeToCommentChanges(transcriptionId, onEvent);
      unsubscribe();

      expect(consoleSpy).toHaveBeenCalledWith('Error unsubscribing from comment subscription:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should return no-op function when subscription setup fails', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock client to throw error
      mockClient.graphql.mockImplementation(() => {
        throw new Error('GraphQL setup failed');
      });

      const unsubscribe = subscribeToCommentChanges(transcriptionId, onEvent);

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Failed to establish comment subscriptions:', expect.any(Error));
      expect(typeof unsubscribe).toBe('function');

      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should ignore events with no comment data', () => {
      const transcriptionId = 'test-transcription-id';
      const onEvent = jest.fn();

      // Mock subscription to capture the next callback
      let createCallback: any;
      mockCreateSubscription.subscribe.mockImplementation((callbacks: any) => {
        createCallback = callbacks.next;
        return { unsubscribe: jest.fn() };
      });

      subscribeToCommentChanges(transcriptionId, onEvent);

      // Simulate subscription event with no comment data
      createCallback({
        data: {
          onCreateComment: null
        }
      });

      expect(onEvent).not.toHaveBeenCalled();
    });
  });
});

describe('commentService queries', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();

    // Mock GraphQL client for queries
    mockClient = {
      graphql: jest.fn(),
    };

    mockGenerateClient.mockReturnValue(mockClient as any);
  });

  describe('loadCommentsForTranscription', () => {
    const transcriptionId = 'test-transcription-id';
    const mockComments = [
      {
        id: 'comment-1',
        text: 'First comment',
        author: 'user-1',
        authorFriendly: 'User One',
        entityType: 'issue',
        entityId: 'issue-1',
        transcriptionId,
        createdAt: '2023-01-02T00:00:00Z',
      },
      {
        id: 'comment-2',
        text: 'Second comment',
        author: 'user-2',
        authorFriendly: 'User Two',
        entityType: 'issue',
        entityId: 'issue-2',
        transcriptionId,
        createdAt: '2023-01-01T00:00:00Z',
      },
    ];

    it('should call GraphQL with correct parameters including _deleted filter', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: mockComments
          }
        }
      });

      await loadCommentsForTranscription(transcriptionId);

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: 'mock-listComments-query',
        variables: {
          filter: {
            transcriptionId: { eq: transcriptionId },
            _deleted: { ne: true }
          },
          limit: 2000
        }
      });
    });

    it('should return comments sorted by creation date (newest first)', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: mockComments
          }
        }
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toHaveLength(2);
      // Should be sorted newest first
      expect(result[0].createdAt).toBe('2023-01-02T00:00:00Z');
      expect(result[1].createdAt).toBe('2023-01-01T00:00:00Z');
    });

    it('should handle empty results', async () => {
      mockClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: []
          }
        }
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toEqual([]);
    });

    it('should handle missing data structure', async () => {
      mockClient.graphql.mockResolvedValue({
        data: null
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors gracefully', async () => {
      const error = new Error('GraphQL network error');
      mockClient.graphql.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to load comments via GraphQL:', error);

      consoleSpy.mockRestore();
    });

    it('should handle comments with missing createdAt dates', async () => {
      const commentsWithMissingDates = [
        {
          id: 'comment-1',
          text: 'Comment with date',
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'comment-2',
          text: 'Comment without date',
          // createdAt is undefined
        },
      ];

      mockClient.graphql.mockResolvedValue({
        data: {
          listComments: {
            items: commentsWithMissingDates
          }
        }
      });

      const result = await loadCommentsForTranscription(transcriptionId);

      expect(result).toHaveLength(2);
      // Comment with valid date should come first
      expect(result[0].createdAt).toBe('2023-01-01T00:00:00Z');
      expect(result[1].createdAt).toBeUndefined();
    });
  });
});