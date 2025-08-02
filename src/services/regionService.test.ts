import { loadRegionsForTranscription, createRegion, updateRegion, deleteRegion, __resetClient } from './regionService';
import { generateClient } from 'aws-amplify/api';
import { RegionModel } from './adt';

// Mock the dependencies
jest.mock('aws-amplify/api');
jest.mock('./adt');
jest.mock('./toastService');

// Mock smart-timeout
const mockTimeouts = new Map<string, NodeJS.Timeout>();

jest.mock('smart-timeout', () => ({
  clear: jest.fn((key: string) => {
    const existingTimeout = mockTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      mockTimeouts.delete(key);
    }
  }),
  set: jest.fn((key: string, callback: () => void, delay: number) => {
    // Clear any existing timeout for this key first
    const existingTimeout = mockTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout
    const newTimeout = setTimeout(() => {
      callback();
      mockTimeouts.delete(key);
    }, delay);
    
    mockTimeouts.set(key, newTimeout);
  }),
}));

describe('RegionService (Simple GraphQL Test)', () => {
  const mockGenerateClient = generateClient as any;
  const MockedRegionModel = RegionModel as jest.MockedClass<typeof RegionModel>;

  const mockGraphqlClient = {
    graphql: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();
    mockGenerateClient.mockReturnValue(mockGraphqlClient as any);
    MockedRegionModel.mockImplementation((data: any) => data as any);
  });

  describe('loadRegionsForTranscription', () => {
    it('should call GraphQL with correct parameters', async () => {
      const transcriptionId = 'test-transcription';
      const mockRegions = [
        { id: 'r1', start: 10, end: 20, transcriptionId },
        { id: 'r2', start: 5, end: 15, transcriptionId },
      ];

      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          listRegions: {
            items: mockRegions,
          },
        },
      });

      const result = await loadRegionsForTranscription(transcriptionId);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: {
          filter: {
            transcriptionId: { eq: transcriptionId },
            _deleted: { ne: true },
          },
          limit: 1000,
        },
      });

      expect(result).toHaveLength(2);
      expect(MockedRegionModel).toHaveBeenCalledTimes(2);
    });

    it('should handle GraphQL errors', async () => {
      const error = new Error('GraphQL failed');
      mockGraphqlClient.graphql.mockRejectedValue(error);

      await expect(loadRegionsForTranscription('test-id')).rejects.toThrow('GraphQL failed');
    });
  });

  describe('createRegion', () => {
    it('should call GraphQL mutation with correct parameters', async () => {
      const transcriptionId = 'test-transcription';
      const regionData = {
        id: 'new-region',
        start: 30,
        end: 40,
        isNote: false,
      };
      const username = 'test-user';

      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          createRegion: {
            ...regionData,
            transcriptionId,
            dateLastUpdated: '1234567890',
            userLastUpdated: username,
          },
        },
      });

      const result = await createRegion(transcriptionId, regionData, username);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: {
          input: {
            id: regionData.id,
            transcriptionId,
            start: regionData.start,
            end: regionData.end,
            isNote: regionData.isNote,
            dateLastUpdated: expect.any(String),
            userLastUpdated: username,
          },
        },
        authMode: 'iam',
      });

      expect(MockedRegionModel).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should set dateLastUpdated as ISO date string when creating region', async () => {
      const transcriptionId = 'transcription-123';
      const regionData = {
        id: 'region-123',
        start: 0,
        end: 10,
        isNote: false,
      };
      const username = 'testuser';

      // Mock the GraphQL response
      mockGraphqlClient.graphql.mockResolvedValue({
        data: {
          createRegion: {
            ...regionData,
            transcriptionId,
            dateLastUpdated: '2025-01-31T19:38:45.123Z',
            userLastUpdated: username,
          },
        },
      });

      await createRegion(transcriptionId, regionData, username);

      // Get the actual call made to GraphQL
      const call = mockGraphqlClient.graphql.mock.calls[0][0];
      const inputData = call.variables.input;
      const dateLastUpdated = inputData.dateLastUpdated;

      // Verify it's an ISO date string (format: YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(dateLastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it can be parsed as a valid date
      const parsedDate = new Date(dateLastUpdated);
      expect(parsedDate.getTime()).not.toBeNaN();
      
      // Verify it's recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - parsedDate.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
    });

    it('should handle region creation errors', async () => {
      const transcriptionId = 'test-transcription';
      const regionData = {
        id: 'new-region',
        start: 30,
        end: 40,
        isNote: false,
      };
      const username = 'test-user';

      mockGraphqlClient.graphql.mockRejectedValue(new Error('Create failed'));

      await expect(createRegion(transcriptionId, regionData, username)).rejects.toThrow('Create failed');
    });
  });

  describe('deleteRegion', () => {
    it('should query then delete region', async () => {
      const regionId = 'test-region';
      const existingRegion = {
        id: regionId,
        _version: 1,
        start: 10,
        end: 20,
      };

      mockGraphqlClient.graphql.mockImplementation((params: any) => {
        if (params.query.includes('getRegion')) {
          return Promise.resolve({
            data: {
              getRegion: existingRegion,
            },
          });
        }
        return Promise.resolve({
          data: {
            deleteRegion: {
              ...existingRegion,
              _deleted: true,
            },
          },
        });
      });

      await deleteRegion(regionId);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(2);
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: { id: regionId },
      });
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: {
          input: {
            id: regionId,
            _version: existingRegion._version,
          },
        },
        authMode: 'iam',
      });
    });

    it('should handle region not found', async () => {
      const regionId = 'missing-region';

      mockGraphqlClient.graphql.mockImplementation((params: any) => {
        if (params.query.includes('getRegion')) {
          return Promise.resolve({
            data: {
              getRegion: null,
            },
          });
        }
        return Promise.resolve({});
      });

      await expect(deleteRegion(regionId)).rejects.toThrow(`Region with ID ${regionId} not found`);
    });
  });

  describe('updateRegion - Core Business Logic', () => {
    const mockOriginalRegion = {
      id: 'test-region',
      _version: 1,
      regionText: 'Original text',
      translation: 'Original translation',
      start: 10,
      end: 20,
      isNote: false,
      dateLastUpdated: '1234567890',
      userLastUpdated: 'original-user',
      transcriptionId: 'test-transcription',
    };

    beforeEach(() => {
      mockGraphqlClient.graphql.mockImplementation((params: any) => {
        if (params.query.includes('getRegion')) {
          return Promise.resolve({
            data: {
              getRegion: mockOriginalRegion,
            },
          });
        }
        if (params.query.includes('updateRegion')) {
          return Promise.resolve({
            data: {
              updateRegion: {
                ...mockOriginalRegion,
                ...params.variables.input,
                _version: 2,
                dateLastUpdated: '1234567890',
                userLastUpdated: 'test-user',
              },
            },
          });
        }
        return Promise.resolve({});
      });
    });

    it('should update region using provided version without pre-fetch', async () => {
      // Test that updateRegion uses provided version directly
      await updateRegion('test-region', { regionText: 'New text' }, 'test-user', 3);

      // Should NOT call getRegion anymore
      const getRegionCalls = mockGraphqlClient.graphql.mock.calls.filter(
        (call: any) => call[0].query.includes('getRegion')
      );
      expect(getRegionCalls).toHaveLength(0);

      // Should call updateRegion with provided version
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('updateRegion'),
        variables: {
          input: expect.objectContaining({
            id: 'test-region',
            _version: 3,
            regionText: 'New text',
            userLastUpdated: 'test-user',
            dateLastUpdated: expect.any(String),
          }),
        },
        authMode: 'iam',
      });
    });

    it('should set dateLastUpdated as ISO date string when updating region', async () => {
      const regionId = 'region-123';
      const updates = { regionText: 'Updated text' };
      const username = 'testuser';

      const existingRegion = {
        id: regionId,
        transcriptionId: 'transcription-123',
        start: 0,
        end: 10,
        regionText: 'Original text',
        dateLastUpdated: '2025-01-30T10:00:00.000Z',
        userLastUpdated: 'originaluser',
        _version: 1,
      };

      // Mock getRegion to succeed
      mockGraphqlClient.graphql
        .mockResolvedValueOnce({
          data: { getRegion: existingRegion },
        })
        // Mock updateRegion to succeed
        .mockResolvedValueOnce({
          data: { 
            updateRegion: {
              ...existingRegion,
              ...updates,
              dateLastUpdated: '2025-01-31T19:38:45.123Z',
              userLastUpdated: username,
            }
          },
        });

      await updateRegion(regionId, updates, username, 1);

      // Look for any call that has an input with our region ID
      const calls = mockGraphqlClient.graphql.mock.calls;
      const updateCall = calls.find(call => {
        const input = call[0]?.variables?.input;
        return input && input.id === regionId && input.dateLastUpdated;
      });
      
      expect(updateCall).toBeDefined();
      
      const inputData = updateCall[0].variables.input;
      const dateLastUpdated = inputData.dateLastUpdated;

      // Verify it's an ISO date string (format: YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(dateLastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it can be parsed as a valid date
      const parsedDate = new Date(dateLastUpdated);
      expect(parsedDate.getTime()).not.toBeNaN();
      
      // Verify it's recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - parsedDate.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
    });

    it('should include version control in update', async () => {
      const existingRegion = {
        id: 'test-region',
        _version: 1,
        transcriptionId: 'transcription-123',
        start: 0,
        end: 10,
        regionText: 'Original text',
        dateLastUpdated: '2025-01-30T10:00:00.000Z',
        userLastUpdated: 'originaluser',
      };

      // Mock getRegion to return existing region
      mockGraphqlClient.graphql
        .mockResolvedValueOnce({
          data: { getRegion: existingRegion },
        })
        // Mock updateRegion to succeed
        .mockResolvedValueOnce({
          data: { updateRegion: { ...existingRegion, regionText: 'New text' } },
        });

      await updateRegion('test-region', { regionText: 'New text' }, 'test-user', 1);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('updateRegion'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              id: 'test-region',
              _version: existingRegion._version,
              regionText: 'New text',
              dateLastUpdated: expect.any(String),
              userLastUpdated: 'test-user',
            }),
          }),
        })
      );
    });

    it('should handle different field types correctly', async () => {
      await updateRegion('test-region', {
        regionText: 'New text',
        translation: 'New translation',
        start: 15,
        end: 25,
        isNote: true,
      }, 'test-user', 1);

      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              regionText: 'New text',
              translation: 'New translation',
              start: 15,
              end: 25,
              isNote: true,
            }),
          }),
        })
      );
    });

    it('should handle missing region gracefully', async () => {
      // Clear previous mocks and set up specific failure
      mockGraphqlClient.graphql.mockReset();
      mockGraphqlClient.graphql.mockImplementation(() => {
        throw new Error('Region not found');
      });

      // This should throw an error when region doesn't exist during update
      await expect(updateRegion('missing-region', { regionText: 'Test' }, 'test-user', 1)).rejects.toThrow('Region not found');

      // Should only call updateRegion (no getRegion anymore)
      expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(1);
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('updateRegion'),
        variables: {
          input: expect.objectContaining({
            id: 'missing-region',
            regionText: 'Test',
            _version: 1,
          }),
        },
        authMode: 'iam',
      });
    });

    it('should handle GraphQL errors gracefully', async () => {
      // Clear previous mocks and set up specific failure
      mockGraphqlClient.graphql.mockReset();
      mockGraphqlClient.graphql.mockImplementation(() => {
        throw new Error('Update failed');
      });

      // This should throw an error when the update fails
      await expect(updateRegion('test-region', { regionText: 'Test' }, 'test-user', 1)).rejects.toThrow('Update failed');

      // Should only call updateRegion (no getRegion anymore)
      expect(mockGraphqlClient.graphql).toHaveBeenCalledTimes(1);
      expect(mockGraphqlClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('updateRegion'),
        variables: {
          input: expect.objectContaining({
            id: 'test-region',
            regionText: 'Test',
            _version: 1,
          }),
        },
        authMode: 'iam',
      });
    });
  });

}); 