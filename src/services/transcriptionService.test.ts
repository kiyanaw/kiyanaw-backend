import { loadInFull, loadAll, __resetClient } from './transcriptionService';
import { generateClient } from 'aws-amplify/api';
import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { TranscriptionModel } from './adt';
import { currentUser } from './userService';
import { transcriptionStorage } from './transcriptionStorageService';
import { Transcription as DSTranscription } from '../models';

// Mock the dependencies
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(),
}));
jest.mock('./regionService');
jest.mock('./issueService');
jest.mock('./adt');
jest.mock('./userService');
jest.mock('./transcriptionStorageService');
jest.mock('./inviteService');

// Mock Amplify Storage
jest.mock('aws-amplify/storage', () => ({
  getUrl: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('TranscriptionService', () => {
  const mockTranscriptionId = 'test-transcription-id';
  const mockRawTranscription = {
    id: mockTranscriptionId,
    title: 'Test Transcription',
    source: 'https://bucket.s3.amazonaws.com/public/audio.mp3',
    author: 'test-user',
  };
  
  const mockTranscriptionModel = {
    id: mockTranscriptionId,
    title: 'Test Transcription',
    source: 'https://bucket.s3.amazonaws.com/public/audio.mp3',
    author: 'test-user',
  };

  const mockPeaksData = [1, 2, 3, 4, 5];
  const mockRegions = [
    { id: 'region1', start: 0, end: 5 },
    { id: 'region2', start: 10, end: 15 },
  ];
  const mockIssues = [
    { id: 'issue1', text: 'Test issue' },
  ];

  const mockGraphqlClient = {
    graphql: jest.fn(),
  };

  const mockGenerateClient = generateClient as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the client so it gets recreated with the mock
    __resetClient();
    
    // Setup GraphQL client mock
    mockGenerateClient.mockReturnValue(mockGraphqlClient as any);
    
    // Setup default GraphQL response
    mockGraphqlClient.graphql.mockResolvedValue({
      data: {
        getTranscription: mockRawTranscription,
      },
    });
    
    // Setup other service mocks - make TranscriptionModel dynamic
    (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
      (data: any) => ({
        ...data,
        setAccessLevel: jest.fn(),
      }) as any
    );
    (loadRegionsForTranscription as jest.Mock).mockResolvedValue(mockRegions);
    (loadIssuesForTranscription as jest.Mock).mockResolvedValue(mockIssues);
    
    // Setup userService mock
    (currentUser as jest.Mock).mockReturnValue({ userId: 'test-user-id' });
    
    // Setup fetch mock for peaks data
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: mockPeaksData }),
    });

    // Mock getUrl from aws-amplify/storage - make it dynamic based on input
    const { getUrl } = require('aws-amplify/storage');
    (getUrl as jest.Mock).mockImplementation(({ path }) => {
      return Promise.resolve({
        url: new URL(`https://fake.s3.amazonaws.com/${path}`),
      });
    });
  });

  describe('loadInFull function signature and validation', () => {
    it('should have correct function signature', () => {
      expect(typeof loadInFull).toBe('function');
      expect(loadInFull.length).toBe(1); // Should accept 1 parameter (transcriptionId)
    });

    it('should throw error when transcriptionId is not provided', async () => {
      await expect(loadInFull('')).rejects.toThrow('transcriptionId is required');
    });

    it('should throw error when transcriptionId is undefined', async () => {
      await expect(loadInFull(undefined as any)).rejects.toThrow('transcriptionId is required');
    });

    it('should throw error when transcriptionId is null', async () => {
      await expect(loadInFull(null as any)).rejects.toThrow('transcriptionId is required');
    });

    it('should accept valid transcriptionId string', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('loadInFull logic flow', () => {
    it('should query GraphQL API with correct transcriptionId', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(2); // 1 for transcription, 1 for comments
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String), // The actual query string
        variables: { id: mockTranscriptionId },
      });
    });

    it('should create TranscriptionModel from GraphQL data', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(TranscriptionModel).toHaveBeenCalledTimes(1);
      expect(TranscriptionModel).toHaveBeenCalledWith(mockRawTranscription);
    });

    it('should fetch peaks data using signed URL', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      // Should use signed URL, not direct URL construction
      expect(global.fetch).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/audio.mp3.json');
    });

    it('should load regions and issues in parallel', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(loadRegionsForTranscription).toHaveBeenCalledTimes(1);
      expect(loadRegionsForTranscription).toHaveBeenCalledWith(mockTranscriptionId);
      
      expect(loadIssuesForTranscription).toHaveBeenCalledTimes(1);
      expect(loadIssuesForTranscription).toHaveBeenCalledWith(mockTranscriptionId);
    });

    it('should return correct data structure', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).toEqual({
        transcription: expect.objectContaining(mockRawTranscription),
        peaks: mockPeaksData,
        regions: mockRegions,
        issues: mockIssues,
        comments: [],
      });
    });
  });

  describe('peaks data fetching logic', () => {
    it('should handle peaks data with data property', async () => {
      const peaksWithDataProperty = { data: [10, 20, 30] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(peaksWithDataProperty),
      });
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.peaks).toEqual([10, 20, 30]);
      }
    });

    it('should handle peaks data without data property', async () => {
      const peaksDirectArray = [40, 50, 60];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(peaksDirectArray),
      });
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.peaks).toEqual([40, 50, 60]);
      }
    });

    it('should throw error when peaks fetch fails with non-retryable status', async () => {
      // Use 500 status code which should fail immediately, not retry
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Failed to load peaks data: 500 Internal Server Error'
      );
    });

    it('should throw error when peaks fetch throws network error', async () => {
      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(/Failed to load peaks data after .* attempts/);
    }, 10000); // Increase timeout to 10 seconds

    it('should handle different HTTP error statuses', async () => {
      // Use 501 status code to differentiate from the other 500 test
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 501,
        statusText: 'Not Implemented',
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Failed to load peaks data: 501 Not Implemented'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should propagate GraphQL query errors', async () => {
      const graphqlError = new Error('GraphQL connection failed');
      mockGraphqlClient.graphql.mockRejectedValue(graphqlError);
      
      const result = await loadInFull(mockTranscriptionId);
      expect(result).toBe(false); // Should return false on GraphQL errors
    });

    it('should propagate region loading errors', async () => {
      const regionError = new Error('Region loading failed');
      (loadRegionsForTranscription as jest.Mock).mockRejectedValue(regionError);
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow('Region loading failed');
    });

    it('should propagate issue loading errors', async () => {
      const issueError = new Error('Issue loading failed');
      (loadIssuesForTranscription as jest.Mock).mockRejectedValue(issueError);
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow('Issue loading failed');
    });

    it('should handle transcription with missing source', async () => {
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          getTranscription: { ...mockRawTranscription, source: null },
        },
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Transcription source is required to load peaks data'
      );
    });

    it('should handle transcription with undefined source', async () => {
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          getTranscription: { ...mockRawTranscription, source: undefined },
        },
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Transcription source is required to load peaks data'
      );
    });
  });

  describe('return value structure and types', () => {
    it('should return object with required properties when access is granted', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result).toHaveProperty('transcription');
        expect(result).toHaveProperty('peaks');
        expect(result).toHaveProperty('regions');
        expect(result).toHaveProperty('issues');
      }
    });

    it('should return transcription as TranscriptionModel instance when access is granted', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.transcription).toEqual(expect.objectContaining(mockRawTranscription));
      }
    });

    it('should return peaks as array of numbers when access is granted', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(Array.isArray(result.peaks)).toBe(true);
        expect(result.peaks).toEqual(mockPeaksData);
      }
    });

    it('should return regions as array when access is granted', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(Array.isArray(result.regions)).toBe(true);
        expect(result.regions).toBe(mockRegions);
      }
    });

    it('should return issues as array when access is granted', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(Array.isArray(result.issues)).toBe(true);
        expect(result.issues).toBe(mockIssues);
      }
    });

    it('should return false when GraphQL access is denied', async () => {
      // Mock GraphQL to return null transcription (not found/access denied)
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          getTranscription: null,
        },
      });
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle successful complete flow', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      // Verify all dependencies were called
      expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(2); // 1 for transcription, 1 for comments
      expect(TranscriptionModel).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(loadRegionsForTranscription).toHaveBeenCalledTimes(1);
      expect(loadIssuesForTranscription).toHaveBeenCalledTimes(1);
      
      // Verify result structure
      expect(result).toEqual({
        transcription: expect.objectContaining(mockRawTranscription),
        peaks: mockPeaksData,
        regions: mockRegions,
        issues: mockIssues,
        comments: [],
      });
    });

    it('should handle empty regions and issues arrays', async () => {
      const emptyRegions: any[] = [];
      const emptyIssues: any[] = [];
      
      (loadRegionsForTranscription as jest.Mock).mockResolvedValue(emptyRegions);
      (loadIssuesForTranscription as jest.Mock).mockResolvedValue(emptyIssues);
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.regions).toEqual([]);
        expect(result.issues).toEqual([]);
      }
    });

    it('should handle different transcription sources with signed URLs', async () => {
      const differentSource = 'https://bucket.s3.amazonaws.com/public/media.wav';
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          getTranscription: { ...mockRawTranscription, source: differentSource },
        },
      });
      
      // Mock getUrl to return different signed URL
      const { getUrl } = require('aws-amplify/storage');
      (getUrl as jest.Mock).mockResolvedValue({
        url: new URL('https://fake.s3.amazonaws.com/public/media.wav.json'),
      });
      
      await loadInFull(mockTranscriptionId);
      
      // Should generate signed URL for the different source
      expect(global.fetch).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/media.wav.json');
    });
  });

  describe('generateSignedUrl', () => {
    // Import the function for direct testing
    const { generateSignedUrl } = require('./transcriptionService');

    beforeEach(() => {
      jest.clearAllMocks();
      
      // Reset getUrl mock for each test
      const { getUrl } = require('aws-amplify/storage');
      (getUrl as jest.Mock).mockImplementation(({ path }) => {
        return Promise.resolve({
          url: new URL(`https://fake.s3.amazonaws.com/${path}`),
        });
      });
    });

    it('should generate signed URL for media file without suffix', async () => {
      const sourceUrl = 'https://bucket.s3.amazonaws.com/public/test-audio.mp3';
      
      const result = await generateSignedUrl(sourceUrl);
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/test-audio.mp3');
    });

    it('should generate signed URL for peaks file with .json suffix', async () => {
      const sourceUrl = 'https://bucket.s3.amazonaws.com/public/test-audio.mp3';
      
      const result = await generateSignedUrl(sourceUrl, '.json');
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/test-audio.mp3.json');
    });

    it('should handle different file types', async () => {
      const videoUrl = 'https://bucket.s3.amazonaws.com/public/video.mp4';
      
      const result = await generateSignedUrl(videoUrl);
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/video.mp4');
    });

    it('should handle URLs with public prefix correctly', async () => {
      const urlWithPublic = 'https://bucket.s3.amazonaws.com/public/folder/file.wav';
      
      const result = await generateSignedUrl(urlWithPublic, '.json');
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/folder/file.wav.json');
    });

    it('should handle URLs without public prefix', async () => {
      const urlWithoutPublic = 'https://bucket.s3.amazonaws.com/direct-file.mp3';
      
      const result = await generateSignedUrl(urlWithoutPublic);
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/direct-file.mp3');
    });

    it('should throw error for invalid URL format', async () => {
      const invalidUrl = 'not-a-valid-url';
      
      await expect(generateSignedUrl(invalidUrl)).rejects.toThrow('Invalid source URL format');
    });

    it('should handle getUrl errors gracefully', async () => {
      // Mock getUrl to throw an error
      const mockGetUrl = require('aws-amplify/storage').getUrl;
      mockGetUrl.mockRejectedValueOnce(new Error('S3 access denied'));
      
      const sourceUrl = 'https://bucket.s3.amazonaws.com/public/test.mp3';
      
      await expect(generateSignedUrl(sourceUrl)).rejects.toThrow('Failed to generate signed URL for file');
    });

    it('should use correct expiration time and options', async () => {
      const mockGetUrl = require('aws-amplify/storage').getUrl;
      const sourceUrl = 'https://bucket.s3.amazonaws.com/public/test.mp3';
      
      await generateSignedUrl(sourceUrl);
      
      expect(mockGetUrl).toHaveBeenCalledWith({
        path: 'public/test.mp3',
        options: {
          expiresIn: 3600, // 1 hour
          useAccelerateEndpoint: false
        }
      });
    });

    it('should handle complex S3 URLs with timestamps', async () => {
      const complexUrl = 'https://bucket.s3.amazonaws.com/public/1234567890-user-audio.mp3';
      
      const result = await generateSignedUrl(complexUrl, '.json');
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/1234567890-user-audio.mp3.json');
    });

    it('should preserve file extensions in key extraction', async () => {
      const sourceUrl = 'https://bucket.s3.amazonaws.com/public/test.file.with.dots.mp4';
      
      const result = await generateSignedUrl(sourceUrl);
      
      expect(result).toBe('https://fake.s3.amazonaws.com/public/test.file.with.dots.mp4');
    });
  });

  describe('loadAll', () => {
    const mockTranscriptionsList = [
      {
        id: 'transcription-1',
        title: 'First Transcription',
        author: 'user1',
        authorFriendly: 'User One',
        type: 'audio',
        source: 'https://bucket.s3.amazonaws.com/public/audio1.mp3',
        length: 120,
        coverage: 0.8,
        isPrivate: false,
        disableAnalyzer: false,
      },
      {
        id: 'transcription-2',
        title: 'Second Transcription',
        author: 'user2',
        authorFriendly: 'User Two',
        type: 'video',
        source: 'https://bucket.s3.amazonaws.com/public/video1.mp4',
        length: 240,
        coverage: 0.6,
        isPrivate: true,
        disableAnalyzer: true,
      },
    ];

    beforeEach(() => {
      // Setup GraphQL response for listTranscriptions
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listTranscriptions: {
            items: mockTranscriptionsList,
          },
        },
      });
    });

    describe('function signature and validation', () => {
      it('should have correct function signature', () => {
        expect(typeof loadAll).toBe('function');
        expect(loadAll.length).toBe(0); // Should accept no parameters
      });

      it('should return promise that resolves to array', async () => {
        const result = await loadAll();
        
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('GraphQL integration', () => {
      it('should call GraphQL API with listTranscriptions query', async () => {
        await loadAll();
        
        expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(1); // Only listTranscriptions
        expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
          query: expect.any(String), // The listTranscriptions query
        });
      });

      it('should handle GraphQL response structure correctly', async () => {
        const result = await loadAll();
        
        expect(result).toHaveLength(2);
        expect(TranscriptionModel).toHaveBeenCalledTimes(2);
        expect(TranscriptionModel).toHaveBeenCalledWith(mockTranscriptionsList[0]);
        expect(TranscriptionModel).toHaveBeenCalledWith(mockTranscriptionsList[1]);
      });

      it('should handle empty list response', async () => {
        mockGraphqlClient.graphql.mockResolvedValue({
          data: {
            listTranscriptions: {
              items: [],
            },
          },
        });

        const result = await loadAll();
        
        expect(result).toEqual([]);
        expect(TranscriptionModel).not.toHaveBeenCalled();
      });

      it('should handle missing listTranscriptions in response', async () => {
        mockGraphqlClient.graphql.mockResolvedValue({
          data: {},
        });

        const result = await loadAll();
        
        expect(result).toEqual([]);
        expect(TranscriptionModel).not.toHaveBeenCalled();
      });

      it('should handle null items array', async () => {
        mockGraphqlClient.graphql.mockResolvedValue({
          data: {
            listTranscriptions: {
              items: null,
            },
          },
        });

        const result = await loadAll();
        
        expect(result).toEqual([]);
        expect(TranscriptionModel).not.toHaveBeenCalled();
      });
    });

    describe('TranscriptionModel wrapping', () => {
      it('should wrap each transcription in TranscriptionModel', async () => {
        const result = await loadAll();
        
        expect(TranscriptionModel).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        
        // Verify each item was passed to TranscriptionModel
        expect(TranscriptionModel).toHaveBeenNthCalledWith(1, mockTranscriptionsList[0]);
        expect(TranscriptionModel).toHaveBeenNthCalledWith(2, mockTranscriptionsList[1]);
      });

      it('should return array of TranscriptionModel instances', async () => {
        // Mock TranscriptionModel to return identifiable objects
        (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
          (data: any) => ({ 
            ...data, 
            isTranscriptionModel: true,
            setAccessLevel: jest.fn(),
          }) as any
        );

        const result = await loadAll();
        
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(expect.objectContaining({ isTranscriptionModel: true }));
        expect(result[1]).toEqual(expect.objectContaining({ isTranscriptionModel: true }));
      });
    });

    describe('error handling', () => {
      it('should throw error when GraphQL call fails', async () => {
        const graphqlError = new Error('GraphQL network error');
        mockGraphqlClient.graphql.mockRejectedValue(graphqlError);
        
        // New sync logic has fallback, so it throws the original error
        await expect(loadAll()).rejects.toThrow('GraphQL network error');
      });

      it('should throw error when GraphQL returns error response', async () => {
        const graphqlError = new Error('Authorization failed');
        mockGraphqlClient.graphql.mockRejectedValue(graphqlError);
        
        // New sync logic has fallback, so it throws the original error
        await expect(loadAll()).rejects.toThrow('Authorization failed');
      });

      it('should handle TranscriptionModel constructor errors', async () => {
        // Mock TranscriptionModel to throw on construction
        (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
          () => { throw new Error('Invalid transcription data'); }
        );

        await expect(loadAll()).rejects.toThrow('Invalid transcription data');
      });
    });

    describe('return value structure', () => {
      it('should return array with correct number of items', async () => {
        const result = await loadAll();
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(mockTranscriptionsList.length);
      });

      it('should maintain order of transcriptions from GraphQL response', async () => {
        // Mock TranscriptionModel to preserve the id
        (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
          (data: any) => ({ 
            ...data,
            setAccessLevel: jest.fn(),
          }) as any
        );

        const result = await loadAll();
        
        expect(result[0].id).toBe('transcription-1');
        expect(result[1].id).toBe('transcription-2');
      });

      it('should handle large numbers of transcriptions', async () => {
        const manyTranscriptions = Array.from({ length: 100 }, (_, i) => ({
          id: `transcription-${i}`,
          title: `Transcription ${i}`,
          author: `user${i}`,
          authorFriendly: `User ${i}`,
          type: 'audio',
          source: `https://bucket.s3.amazonaws.com/public/audio${i}.mp3`,
        }));

        mockGraphqlClient.graphql.mockResolvedValue({
          data: {
            listTranscriptions: {
              items: manyTranscriptions,
            },
          },
        });

        const result = await loadAll();
        
        expect(result).toHaveLength(100);
        expect(TranscriptionModel).toHaveBeenCalledTimes(100);
      });
    });

    describe('integration scenarios', () => {
      it('should complete successful flow with multiple transcriptions', async () => {
        const result = await loadAll();
        
        // Verify GraphQL was called
        expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(1); // Only listTranscriptions
        
        // Verify TranscriptionModel was called for each item
        expect(TranscriptionModel).toHaveBeenCalledTimes(2);
        
        // Verify result structure
        expect(result).toHaveLength(2);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle mixed transcription types correctly', async () => {
        const mixedTranscriptions = [
          { ...mockTranscriptionsList[0], type: 'audio' },
          { ...mockTranscriptionsList[1], type: 'video' },
        ];

        mockGraphqlClient.graphql.mockResolvedValue({
          data: {
            listTranscriptions: {
              items: mixedTranscriptions,
            },
          },
        });

        const result = await loadAll();
        
        expect(result).toHaveLength(2);
        expect(TranscriptionModel).toHaveBeenCalledWith(expect.objectContaining({ type: 'audio' }));
        expect(TranscriptionModel).toHaveBeenCalledWith(expect.objectContaining({ type: 'video' }));
      });

      it('should work with minimal transcription data', async () => {
        const minimalTranscriptions = [
          {
            id: 'minimal-1',
            title: 'Minimal',
            author: 'user',
            authorFriendly: 'User',
            type: 'audio',
            source: 'https://example.com/audio.mp3',
            length: 0,
          },
        ];

        mockGraphqlClient.graphql.mockResolvedValue({
          data: {
            listTranscriptions: {
              items: minimalTranscriptions,
            },
          },
        });

        const result = await loadAll();
        
        expect(result).toHaveLength(1);
        expect(TranscriptionModel).toHaveBeenCalledWith(minimalTranscriptions[0]);
      });
    });
  });
}); 
