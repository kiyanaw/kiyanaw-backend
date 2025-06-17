import { loadInFull } from './transcriptionService';
import { DataStore } from '@aws-amplify/datastore';
import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { TranscriptionModel } from './adt';
import { Transcription as DSTranscription } from '../models';

// Mock the dependencies
jest.mock('@aws-amplify/datastore');
jest.mock('./regionService');
jest.mock('./issueService');
jest.mock('./adt');
jest.mock('../models', () => ({
  Transcription: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('TranscriptionService', () => {
  const mockTranscriptionId = 'test-transcription-id';
  const mockRawTranscription = {
    id: mockTranscriptionId,
    title: 'Test Transcription',
    source: 'https://example.com/audio.mp3',
    author: 'test-user',
  };
  
  const mockTranscriptionModel = {
    id: mockTranscriptionId,
    title: 'Test Transcription',
    source: 'https://example.com/audio.mp3',
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (DataStore.query as jest.Mock).mockResolvedValue(mockRawTranscription);
    (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
      () => mockTranscriptionModel as any
    );
    (loadRegionsForTranscription as jest.Mock).mockResolvedValue(mockRegions);
    (loadIssuesForTranscription as jest.Mock).mockResolvedValue(mockIssues);
    
    // Setup fetch mock for peaks data
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: mockPeaksData }),
    });
  });

  describe('loadInFull function signature and validation', () => {
    it('should have correct function signature', () => {
      expect(typeof loadInFull).toBe('function');
      expect(loadInFull.length).toBe(1); // Should accept 1 parameter
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
    it('should query DataStore with correct transcriptionId', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(DataStore.query).toHaveBeenCalledTimes(1);
      expect(DataStore.query).toHaveBeenCalledWith(DSTranscription, mockTranscriptionId);
    });

    it('should create TranscriptionModel from raw data', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(TranscriptionModel).toHaveBeenCalledTimes(1);
      expect(TranscriptionModel).toHaveBeenCalledWith(mockRawTranscription);
    });



    it('should fetch peaks data using transcription source', async () => {
      await loadInFull(mockTranscriptionId);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(`${mockTranscriptionModel.source}.json`);
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
        transcription: mockTranscriptionModel,
        peaks: mockPeaksData,
        regions: mockRegions,
        issues: mockIssues,
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
      
      expect(result.peaks).toEqual([10, 20, 30]);
    });

    it('should handle peaks data without data property', async () => {
      const peaksDirectArray = [40, 50, 60];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(peaksDirectArray),
      });
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result.peaks).toEqual([40, 50, 60]);
    });

    it('should throw error when peaks fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Failed to load peaks data: 404 Not Found'
      );
    });

    it('should throw error when peaks fetch throws network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow('Network error');
    });

    it('should handle different HTTP error statuses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow(
        'Failed to load peaks data: 500 Internal Server Error'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should propagate DataStore query errors', async () => {
      const datastoreError = new Error('DataStore connection failed');
      (DataStore.query as jest.Mock).mockRejectedValue(datastoreError);
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow('DataStore connection failed');
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
      const transcriptionWithoutSource = { ...mockTranscriptionModel, source: null };
      (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementationOnce(
        () => transcriptionWithoutSource as any
      );
      
      // Mock fetch to fail when called with null.json
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('TypeError: Failed to fetch'));
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow();
    });

    it('should handle transcription with undefined source', async () => {
      const transcriptionWithUndefinedSource = { ...mockTranscriptionModel, source: undefined };
      (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementationOnce(
        () => transcriptionWithUndefinedSource as any
      );
      
      // Mock fetch to fail when called with undefined.json
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('TypeError: Failed to fetch'));
      
      await expect(loadInFull(mockTranscriptionId)).rejects.toThrow();
    });
  });

  describe('return value structure and types', () => {
    it('should return object with required properties', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result).toHaveProperty('transcription');
      expect(result).toHaveProperty('peaks');
      expect(result).toHaveProperty('regions');
      expect(result).toHaveProperty('issues');
    });

    it('should return transcription as TranscriptionModel instance', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result.transcription).toBe(mockTranscriptionModel);
    });

    it('should return peaks as array of numbers', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(Array.isArray(result.peaks)).toBe(true);
      expect(result.peaks).toEqual(mockPeaksData);
    });

    it('should return regions as array', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(Array.isArray(result.regions)).toBe(true);
      expect(result.regions).toBe(mockRegions);
    });

    it('should return issues as array', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.issues).toBe(mockIssues);
    });
  });

  describe('integration scenarios', () => {
    it('should handle successful complete flow', async () => {
      const result = await loadInFull(mockTranscriptionId);
      
      // Verify all dependencies were called
      expect(DataStore.query).toHaveBeenCalledTimes(1);
      expect(TranscriptionModel).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(loadRegionsForTranscription).toHaveBeenCalledTimes(1);
      expect(loadIssuesForTranscription).toHaveBeenCalledTimes(1);
      
      // Verify result structure
      expect(result).toMatchObject({
        transcription: expect.any(Object),
        peaks: expect.any(Array),
        regions: expect.any(Array),
        issues: expect.any(Array),
      });
    });

    it('should handle empty regions and issues arrays', async () => {
      (loadRegionsForTranscription as jest.Mock).mockResolvedValue([]);
      (loadIssuesForTranscription as jest.Mock).mockResolvedValue([]);
      
      const result = await loadInFull(mockTranscriptionId);
      
      expect(result.regions).toEqual([]);
      expect(result.issues).toEqual([]);
    });

    it('should handle different transcription sources', async () => {
      const differentSource = 'https://different.com/media.wav';
      const differentTranscription = { ...mockTranscriptionModel, source: differentSource };
      (TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>).mockImplementation(
        () => differentTranscription as any
      );
      
      await loadInFull(mockTranscriptionId);
      
      expect(global.fetch).toHaveBeenCalledWith(`${differentSource}.json`);
    });
  });
}); 