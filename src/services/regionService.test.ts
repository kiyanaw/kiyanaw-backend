import { loadRegionsForTranscription, createRegion, updateRegion, updateRegionWithAnalysis } from './regionService';
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

  describe('updateRegion', () => {
    const mockRegionId = 'test-region-id';
    const mockUsername = 'test-user';
    const mockOriginalRegion = {
      id: mockRegionId,
      regionText: 'Original text',
      translation: 'Original translation',
      start: 10,
      end: 20,
      isNote: false,
      dateLastUpdated: '1234567890',
      userLastUpdated: 'original-user'
    };

    // Mock DOM for toast functionality
    const mockToastElement = {
      style: {},
      textContent: '',
      remove: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      
      // Mock DataStore.query to return original region
      (DataStore.query as jest.Mock).mockResolvedValue(mockOriginalRegion);
      
      // Mock DataStore.save
      (DataStore.save as jest.Mock).mockResolvedValue(mockOriginalRegion);
      
      // Mock DSRegion.copyOf
      (DSRegion.copyOf as jest.Mock) = jest.fn((original, updater) => {
        const draft = { ...original };
        updater(draft);
        return draft;
      });

      // Mock DOM methods for toast
      jest.spyOn(document, 'createElement').mockReturnValue(mockToastElement as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockToastElement as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockToastElement as any);
      
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    describe('debouncing behavior', () => {
      it('should debounce multiple rapid updates', async () => {
        // Make multiple rapid calls
        updateRegion(mockRegionId, { regionText: 'Update 1' }, mockUsername, 100);
        updateRegion(mockRegionId, { regionText: 'Update 2' }, mockUsername, 100);
        updateRegion(mockRegionId, { regionText: 'Update 3' }, mockUsername, 100);

        // Run all timers to trigger save
        jest.runAllTimers();
        await Promise.resolve(); // Wait for async operations

        // Should only save once with the final update
        expect(DataStore.save).toHaveBeenCalledTimes(1);
        expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      });

      it('should merge updates from multiple calls', async () => {
        // Make calls with different fields
        updateRegion(mockRegionId, { regionText: 'New text' }, mockUsername, 100);
        updateRegion(mockRegionId, { translation: 'New translation' }, mockUsername, 100);

        // Run all timers to trigger save
        jest.runAllTimers();
        await Promise.resolve();

        // Should merge both updates
        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.regionText).toBe('New text');
        expect(draft.translation).toBe('New translation');
      });

      it('should use default debounce time of 1500ms', async () => {
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername);

        // Should not save before 1500ms
        jest.advanceTimersByTime(1499);
        await Promise.resolve();
        expect(DataStore.save).not.toHaveBeenCalled();

        // Should save at 1500ms
        jest.advanceTimersByTime(1);
        await Promise.resolve();
        expect(DataStore.save).toHaveBeenCalledTimes(1);
      });

      it('should use custom debounce time', async () => {
        const customDebounce = 500;
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, customDebounce);

        // Should not save before custom time
        jest.advanceTimersByTime(customDebounce - 1);
        await Promise.resolve();
        expect(DataStore.save).not.toHaveBeenCalled();

        // Should save at custom time
        jest.advanceTimersByTime(1);
        await Promise.resolve();
        expect(DataStore.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('field updates', () => {
      it('should update regionText field', async () => {
        updateRegion(mockRegionId, { regionText: 'New region text' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.regionText).toBe('New region text');
      });

      it('should update translation field', async () => {
        updateRegion(mockRegionId, { translation: 'New translation' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.translation).toBe('New translation');
      });

      it('should update start field', async () => {
        updateRegion(mockRegionId, { start: 15 }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.start).toBe(15);
      });

      it('should update end field', async () => {
        updateRegion(mockRegionId, { end: 25 }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.end).toBe(25);
      });

      it('should update isNote field', async () => {
        updateRegion(mockRegionId, { isNote: true }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.isNote).toBe(true);
      });

      it('should update multiple fields at once', async () => {
        updateRegion(mockRegionId, { 
          regionText: 'New text',
          translation: 'New translation',
          start: 15,
          end: 25,
          isNote: true
        }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.regionText).toBe('New text');
        expect(draft.translation).toBe('New translation');
        expect(draft.start).toBe(15);
        expect(draft.end).toBe(25);
        expect(draft.isNote).toBe(true);
      });

      it('should always update metadata fields', async () => {
        const beforeCall = Date.now();
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        const afterCall = Date.now();
        const timestamp = parseInt(draft.dateLastUpdated);
        
        expect(timestamp).toBeGreaterThanOrEqual(beforeCall);
        expect(timestamp).toBeLessThanOrEqual(afterCall);
        expect(draft.userLastUpdated).toBe(mockUsername);
      });
    });

    describe('toast notifications', () => {
      it('should show success toast on successful save', async () => {
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        // Run all timers and flush all promises
        jest.runAllTimers();
        await Promise.resolve(); // First flush
        await Promise.resolve(); // Second flush for nested promises

        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.body.appendChild).toHaveBeenCalled();
        expect(mockToastElement.textContent).toContain(`Saved region ${mockRegionId.slice(0, 8)}`);
      });

      it('should show error toast on save failure', async () => {
        const saveError = new Error('Save failed');
        (DataStore.save as jest.Mock).mockRejectedValue(saveError);
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve(); // First flush
        await Promise.resolve(); // Second flush for nested promises

        expect(mockToastElement.textContent).toContain(`Failed to save region ${mockRegionId.slice(0, 8)}`);
      });

      it('should log success message to console', async () => {
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve(); // First flush
        await Promise.resolve(); // Second flush for nested promises

        expect(console.log).toHaveBeenCalledWith(`✅ Saved region ${mockRegionId}`);
      });

      it('should log error message to console on failure', async () => {
        const saveError = new Error('Save failed');
        (DataStore.save as jest.Mock).mockRejectedValue(saveError);
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve(); // First flush
        await Promise.resolve(); // Second flush for nested promises

        expect(console.error).toHaveBeenCalledWith(`❌ Failed to save region ${mockRegionId}:`, saveError);
      });
    });

    describe('error handling', () => {
      it('should handle region not found', async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        expect(console.error).toHaveBeenCalledWith(`Region with ID ${mockRegionId} not found`);
        expect(DataStore.save).not.toHaveBeenCalled();
      });

      it('should handle DataStore query errors', async () => {
        const queryError = new Error('Query failed');
        (DataStore.query as jest.Mock).mockRejectedValue(queryError);
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        expect(console.error).toHaveBeenCalledWith(`❌ Failed to save region ${mockRegionId}:`, queryError);
      });

      it('should handle DataStore save errors', async () => {
        const saveError = new Error('Save failed');
        (DataStore.save as jest.Mock).mockRejectedValue(saveError);
        
        updateRegion(mockRegionId, { regionText: 'Test' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve(); // First flush
        await Promise.resolve(); // Second flush for nested promises

        expect(console.error).toHaveBeenCalledWith(`❌ Failed to save region ${mockRegionId}:`, saveError);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string updates', async () => {
        updateRegion(mockRegionId, { regionText: '', translation: '' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.regionText).toBe('');
        expect(draft.translation).toBe('');
      });

      it('should handle undefined values by not updating those fields', async () => {
        updateRegion(mockRegionId, { regionText: 'New text' }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        // Only regionText should be updated, others should remain unchanged
        expect(draft.regionText).toBe('New text');
        expect(draft.translation).toBe(mockOriginalRegion.translation);
        expect(draft.start).toBe(mockOriginalRegion.start);
      });

      it('should handle zero values correctly', async () => {
        updateRegion(mockRegionId, { start: 0, end: 0 }, mockUsername, 10);
        
        jest.runAllTimers();
        await Promise.resolve();

        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.start).toBe(0);
        expect(draft.end).toBe(0);
      });
    });

    describe('race condition prevention', () => {
      it('should prevent race conditions from simultaneous updates', async () => {
        // Simulate rapid user typing
        updateRegion(mockRegionId, { regionText: 'a' }, mockUsername, 100);
        updateRegion(mockRegionId, { regionText: 'ab' }, mockUsername, 100);
        updateRegion(mockRegionId, { regionText: 'abc' }, mockUsername, 100);
        updateRegion(mockRegionId, { regionText: 'abcd' }, mockUsername, 100);

        // Should only save once with final value
        jest.runAllTimers();
        await Promise.resolve();

        expect(DataStore.save).toHaveBeenCalledTimes(1);
        
        const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
        const draft = { ...mockOriginalRegion };
        updaterFunction(draft);

        expect(draft.regionText).toBe('abcd');
      });
    });
  });

  describe('updateRegionWithAnalysis', () => {
    const mockRegionId = 'test-region-id';
    const mockUsername = 'test-user';
    const mockOriginalRegion = {
      id: mockRegionId,
      regionText: 'original text',
      translation: 'original translation',
      start: 10,
      end: 20,
      isNote: false,
      regionAnalysis: null,
      dateLastUpdated: '1234567890',
      userLastUpdated: 'old-user'
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      
      // Mock DataStore.query to return original region
      (DataStore.query as jest.Mock).mockResolvedValue(mockOriginalRegion);
      
      // Mock DataStore.save
      (DataStore.save as jest.Mock).mockResolvedValue(mockOriginalRegion);
      
      // Mock DSRegion.copyOf
      (DSRegion.copyOf as jest.Mock) = jest.fn((original, updater) => {
        const draft = { ...original };
        updater(draft);
        return draft;
      });

      // Mock DOM methods for toast
      const mockToastElement = {
        style: {},
        textContent: '',
        remove: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockToastElement as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockToastElement as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockToastElement as any);
      
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should update region with text and automatically include analysis from store', async () => {
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          regionById: jest.fn().mockReturnValue({
            regionAnalysis: ['hello', 'world']
          })
        })
      };

      updateRegionWithAnalysis(
        mockRegionId,
        { regionText: 'new text' },
        mockUsername,
        mockStore,
        100
      );

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.regionText).toBe('new text');
      expect(draft.regionAnalysis).toBe(JSON.stringify(['hello', 'world']));
      expect(draft.userLastUpdated).toBe(mockUsername);
    });

    it('should update region without analysis when regionAnalysis is not available', async () => {
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          regionById: jest.fn().mockReturnValue({
            regionAnalysis: null
          })
        })
      };

      updateRegionWithAnalysis(
        mockRegionId,
        { regionText: 'new text' },
        mockUsername,
        mockStore,
        100
      );

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.regionText).toBe('new text');
      expect(draft.userLastUpdated).toBe(mockUsername);
      // Should not have regionAnalysis set
      expect(draft.regionAnalysis).toBeNull();
    });

    it('should not include analysis when updating translation field', async () => {
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          regionById: jest.fn().mockReturnValue({
            regionAnalysis: ['hello', 'world']
          })
        })
      };

      updateRegionWithAnalysis(
        mockRegionId,
        { translation: 'new translation' },
        mockUsername,
        mockStore,
        100
      );

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.translation).toBe('new translation');
      expect(draft.userLastUpdated).toBe(mockUsername);
      // Should not include regionAnalysis when updating translation
      expect(draft.regionAnalysis).toBeNull(); // Should remain original value
    });

    it('should merge multiple updates and include latest analysis', async () => {
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          regionById: jest.fn().mockReturnValue({
            regionAnalysis: ['final', 'analysis']
          })
        })
      };

      // Make multiple rapid updates
      updateRegionWithAnalysis(mockRegionId, { regionText: 'first update' }, mockUsername, mockStore, 100);
      updateRegionWithAnalysis(mockRegionId, { translation: 'translation update' }, mockUsername, mockStore, 100);
      updateRegionWithAnalysis(mockRegionId, { regionText: 'final update' }, mockUsername, mockStore, 100);

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the merged fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.regionText).toBe('final update');
      expect(draft.translation).toBe('translation update');
      expect(draft.regionAnalysis).toBe(JSON.stringify(['final', 'analysis']));
      expect(draft.userLastUpdated).toBe(mockUsername);
    });

    it('should handle store errors gracefully', async () => {
      const mockStore = {
        getState: jest.fn().mockImplementation(() => {
          throw new Error('Store error');
        })
      };

      // Should not throw, should continue with save without analysis
      updateRegionWithAnalysis(
        mockRegionId,
        { regionText: 'new text' },
        mockUsername,
        mockStore,
        100
      );

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.regionText).toBe('new text');
      expect(draft.userLastUpdated).toBe(mockUsername);
      // Should not have regionAnalysis set due to store error
      expect(draft.regionAnalysis).toBeNull();
    });

    it('should handle empty analysis array', async () => {
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          regionById: jest.fn().mockReturnValue({
            regionAnalysis: []
          })
        })
      };

      updateRegionWithAnalysis(
        mockRegionId,
        { regionText: 'new text' },
        mockUsername,
        mockStore,
        100
      );

      // Run timers to trigger debounced save
      jest.runAllTimers();
      await Promise.resolve();

      expect(DataStore.save).toHaveBeenCalledTimes(1);
      expect(DSRegion.copyOf).toHaveBeenCalledWith(mockOriginalRegion, expect.any(Function));
      
      // Check that the updater function properly sets the fields
      const updaterFunction = (DSRegion.copyOf as jest.Mock).mock.calls[0][1];
      const draft = { ...mockOriginalRegion };
      updaterFunction(draft);

      expect(draft.regionText).toBe('new text');
      expect(draft.regionAnalysis).toBe(JSON.stringify([]));
      expect(draft.userLastUpdated).toBe(mockUsername);
    });
  });
}); 