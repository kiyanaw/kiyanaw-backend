import { loadRegionsForTranscription, createRegion } from './regionService';
import { DataStore } from '@aws-amplify/datastore';
import { Region as DSRegion, Transcription as DSTranscription } from '../models';
import { RegionModel } from './adt';

// Mock the dependencies
jest.mock('@aws-amplify/datastore');
jest.mock('./adt');
jest.mock('../models', () => ({
  Region: jest.fn(),
  Transcription: jest.fn(),
}));

describe('RegionService', () => {
  const mockTranscriptionId = 'test-transcription-id';
  const mockUsername = 'test-user';
  
  const mockRawRegions = [
    {
      id: 'region-1',
      start: 10,
      end: 20,
      isNote: false,
      dateLastUpdated: '1234567890',
      userLastUpdated: 'user1',
    },
    {
      id: 'region-2',
      start: 5,
      end: 15,
      isNote: true,
      dateLastUpdated: '1234567891',
      userLastUpdated: 'user2',
    },
    {
      id: 'region-3',
      start: 25,
      end: 35,
      isNote: false,
      dateLastUpdated: '1234567892',
      userLastUpdated: 'user3',
    },
  ];

  const mockProcessedRegions = [
    { id: 'region-2', start: 5, end: 15, isNote: true },
    { id: 'region-1', start: 10, end: 20, isNote: false },
    { id: 'region-3', start: 25, end: 35, isNote: false },
  ];

  const mockTranscription = {
    id: mockTranscriptionId,
    title: 'Test Transcription',
    source: 'test-source.mp3',
  };

  const mockRegionData = {
    id: 'new-region-id',
    start: 30,
    end: 40,
    isNote: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (DataStore.query as jest.Mock).mockResolvedValue(mockRawRegions);
    (RegionModel as jest.MockedClass<typeof RegionModel>).mockImplementation(
      (data: any) => data as any
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadRegionsForTranscription', () => {
    describe('function signature and validation', () => {
      it('should have correct function signature', () => {
        expect(typeof loadRegionsForTranscription).toBe('function');
        expect(loadRegionsForTranscription.length).toBe(1); // Should accept 1 parameter
      });

      it('should accept transcriptionId parameter', async () => {
        const result = await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('DataStore query logic', () => {
      it('should query DataStore with correct parameters', async () => {
        await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(DataStore.query).toHaveBeenCalledTimes(1);
        expect(DataStore.query).toHaveBeenCalledWith(DSRegion, expect.any(Function));
      });

      it('should use correct filter function', async () => {
        const mockFilterFunction = jest.fn().mockReturnValue({
          id: {
            eq: jest.fn(),
          },
        });
        
        (DataStore.query as jest.Mock).mockImplementation((model, filterFn) => {
          const mockRegion = {
            transcription: mockFilterFunction(),
          };
          filterFn(mockRegion);
          return Promise.resolve(mockRawRegions);
        });
        
        await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(mockFilterFunction).toHaveBeenCalled();
      });

      it('should handle empty query results', async () => {
        (DataStore.query as jest.Mock).mockResolvedValue([]);
        
        const result = await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(result).toEqual([]);
      });
    });

    describe('region processing logic', () => {
      it('should sort regions by start time', async () => {
        const result = await loadRegionsForTranscription(mockTranscriptionId);
        
        // Verify regions are sorted by start time (5, 10, 25)
        expect(result[0].start).toBe(5);
        expect(result[1].start).toBe(10);
        expect(result[2].start).toBe(25);
      });

      it('should create RegionModel instances for each region', async () => {
        await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(RegionModel).toHaveBeenCalledTimes(3);
        expect(RegionModel).toHaveBeenCalledWith(mockRawRegions[1]); // First after sorting (start: 5)
        expect(RegionModel).toHaveBeenCalledWith(mockRawRegions[0]); // Second after sorting (start: 10)
        expect(RegionModel).toHaveBeenCalledWith(mockRawRegions[2]); // Third after sorting (start: 25)
      });

      it('should not mutate original array during sorting', async () => {
        const originalRegions = [...mockRawRegions];
        (DataStore.query as jest.Mock).mockResolvedValue(mockRawRegions);
        
        await loadRegionsForTranscription(mockTranscriptionId);
        
        // Original array should remain unchanged
        expect(mockRawRegions).toEqual(originalRegions);
      });

      it('should handle regions with same start time', async () => {
        const regionsWithSameStart = [
          { id: 'region-1', start: 10, end: 20 },
          { id: 'region-2', start: 10, end: 15 },
          { id: 'region-3', start: 5, end: 25 },
        ];
        
        (DataStore.query as jest.Mock).mockResolvedValue(regionsWithSameStart);
        
        const result = await loadRegionsForTranscription(mockTranscriptionId);
        
        // Should still be sorted, with regions having same start time maintaining relative order
        expect(result[0].start).toBe(5);
        expect(result[1].start).toBe(10);
        expect(result[2].start).toBe(10);
      });
    });

    describe('error handling', () => {
      it('should propagate DataStore query errors', async () => {
        const datastoreError = new Error('DataStore query failed');
        (DataStore.query as jest.Mock).mockRejectedValue(datastoreError);
        
        await expect(loadRegionsForTranscription(mockTranscriptionId)).rejects.toThrow('DataStore query failed');
      });

      it('should propagate RegionModel creation errors', async () => {
        const regionModelError = new Error('RegionModel creation failed');
        (RegionModel as jest.MockedClass<typeof RegionModel>).mockImplementation(() => {
          throw regionModelError;
        });
        
        await expect(loadRegionsForTranscription(mockTranscriptionId)).rejects.toThrow('RegionModel creation failed');
      });
    });

    describe('return value structure', () => {
      it('should return array of RegionModel instances', async () => {
        const result = await loadRegionsForTranscription(mockTranscriptionId);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(3);
      });


    });
  });

  describe('createRegion', () => {
    beforeEach(() => {
      (DataStore.query as jest.Mock).mockResolvedValue(mockTranscription);
      (DataStore.save as jest.Mock).mockResolvedValue({ ...mockRegionData, id: 'saved-region-id' });
      (DSRegion as any).mockImplementation((data: any) => data);
    });

    describe('function signature and validation', () => {
      it('should have correct function signature', () => {
        expect(typeof createRegion).toBe('function');
        expect(createRegion.length).toBe(3); // Should accept 3 parameters
      });

      it('should accept required parameters', async () => {
        const result = await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        expect(result).toBeDefined();
      });
    });

    describe('transcription validation logic', () => {
      it('should query for transcription first', async () => {
        await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        expect(DataStore.query).toHaveBeenCalledWith(DSTranscription, mockTranscriptionId);
      });

      it('should throw error when transcription not found', async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow(`Transcription with ID ${mockTranscriptionId} not found`);
      });

      it('should throw error when transcription is undefined', async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(undefined);
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow(`Transcription with ID ${mockTranscriptionId} not found`);
      });
    });

    describe('region creation logic', () => {
      it('should create DSRegion with correct data', async () => {
        await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        expect(DSRegion).toHaveBeenCalledWith({
          id: mockRegionData.id,
          start: mockRegionData.start,
          end: mockRegionData.end,
          isNote: mockRegionData.isNote,
          dateLastUpdated: expect.any(String),
          userLastUpdated: mockUsername,
          transcription: mockTranscription,
        });
      });

      it('should default isNote to false when not provided', async () => {
        const regionWithoutIsNote = {
          id: 'test-id',
          start: 10,
          end: 20,
        };
        
        await createRegion(mockTranscriptionId, regionWithoutIsNote, mockUsername);
        
        expect(DSRegion).toHaveBeenCalledWith(
          expect.objectContaining({
            isNote: false,
          })
        );
      });

      it('should use current timestamp for dateLastUpdated', async () => {
        const beforeCall = Date.now();
        
        await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        const afterCall = Date.now();
        const callArgs = (DSRegion as any).mock.calls[0][0];
        const timestamp = parseInt(callArgs.dateLastUpdated);
        
        expect(timestamp).toBeGreaterThanOrEqual(beforeCall);
        expect(timestamp).toBeLessThanOrEqual(afterCall);
      });

      it('should save region to DataStore', async () => {
        const mockCreatedRegion = { id: 'created-region' };
        (DSRegion as any).mockReturnValue(mockCreatedRegion);
        
        await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        expect(DataStore.save).toHaveBeenCalledWith(mockCreatedRegion);
      });

      it('should return RegionModel instance', async () => {
        const mockSavedRegion = { savedId: 'saved-region', ...mockRegionData };
        (DataStore.save as jest.Mock).mockResolvedValue(mockSavedRegion);
        
        const result = await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        expect(RegionModel).toHaveBeenCalledWith(mockSavedRegion);
      });
    });

    describe('parameter handling', () => {
      it('should handle different region data structures', async () => {
        const minimalRegion = {
          id: 'minimal-id',
          start: 0,
          end: 5,
        };
        
        await createRegion(mockTranscriptionId, minimalRegion, mockUsername);
        
        expect(DSRegion).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'minimal-id',
            start: 0,
            end: 5,
            isNote: false,
          })
        );
      });

      it('should handle different usernames', async () => {
        const differentUsername = 'different-user';
        
        await createRegion(mockTranscriptionId, mockRegionData, differentUsername);
        
        expect(DSRegion).toHaveBeenCalledWith(
          expect.objectContaining({
            userLastUpdated: differentUsername,
          })
        );
      });

      it('should handle different transcriptionIds', async () => {
        const differentTranscriptionId = 'different-transcription-id';
        
        await createRegion(differentTranscriptionId, mockRegionData, mockUsername);
        
        expect(DataStore.query).toHaveBeenCalledWith(DSTranscription, differentTranscriptionId);
      });
    });

    describe('error handling', () => {
      it('should propagate DataStore query errors', async () => {
        const queryError = new Error('DataStore query failed');
        (DataStore.query as jest.Mock).mockRejectedValue(queryError);
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow('DataStore query failed');
      });

      it('should propagate DataStore save errors', async () => {
        const saveError = new Error('DataStore save failed');
        (DataStore.save as jest.Mock).mockRejectedValue(saveError);
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow('DataStore save failed');
      });

      it('should propagate DSRegion creation errors', async () => {
        const regionError = new Error('DSRegion creation failed');
        (DSRegion as any).mockImplementation(() => {
          throw regionError;
        });
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow('DSRegion creation failed');
      });

      it('should propagate RegionModel creation errors', async () => {
        const regionModelError = new Error('RegionModel creation failed');
        (RegionModel as jest.MockedClass<typeof RegionModel>).mockImplementation(() => {
          throw regionModelError;
        });
        
        await expect(createRegion(mockTranscriptionId, mockRegionData, mockUsername))
          .rejects.toThrow('RegionModel creation failed');
      });
    });

    describe('integration scenarios', () => {
      it('should handle complete successful flow', async () => {
        const result = await createRegion(mockTranscriptionId, mockRegionData, mockUsername);
        
        // Verify all steps were called
        expect(DataStore.query).toHaveBeenCalledWith(DSTranscription, mockTranscriptionId);
        expect(DSRegion).toHaveBeenCalled();
        expect(DataStore.save).toHaveBeenCalled();
        expect(RegionModel).toHaveBeenCalled();
        
        expect(result).toBeDefined();
      });

      it('should handle edge case with zero start/end times', async () => {
        const edgeCaseRegion = {
          id: 'edge-case-id',
          start: 0,
          end: 0,
          isNote: false,
        };
        
        await expect(createRegion(mockTranscriptionId, edgeCaseRegion, mockUsername))
          .resolves.toBeDefined();
      });

      it('should handle very large timestamp values', async () => {
        const largeTimeRegion = {
          id: 'large-time-id',
          start: 999999,
          end: 9999999,
          isNote: true,
        };
        
        await expect(createRegion(mockTranscriptionId, largeTimeRegion, mockUsername))
          .resolves.toBeDefined();
      });
    });
  });
}); 