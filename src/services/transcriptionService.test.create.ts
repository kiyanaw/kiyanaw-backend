import * as transcriptionService from './transcriptionService';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription } from '../models';

// Mock DataStore
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    save: jest.fn()
  }
}));

// Mock fetch for peaks data testing
global.fetch = jest.fn();

const mockDataStore = DataStore as jest.Mocked<typeof DataStore>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('TranscriptionService - New Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create transcription with provided data', async () => {
      const mockSavedTranscription = {
        id: 'transcription-id',
        title: 'Test Title',
        source: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        author: 'testuser'
      };
      
      mockDataStore.save.mockResolvedValue(mockSavedTranscription as any);

      const createData = {
        title: 'Test Title',
        source: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        author: 'testuser',
        userLastUpdated: 'testuser'
      };

      const result = await transcriptionService.create(createData);

      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          source: 'https://example.com/audio.mp3',
          type: 'audio/mpeg',
          author: 'testuser',
          userLastUpdated: 'testuser',
          issues: '',
          length: 0,
          coverage: 0,
          disableAnalyzer: false,
          isPrivate: true
        })
      );
      expect(result).toBe(mockSavedTranscription);
    });

    it('should trim title when creating transcription', async () => {
      const mockSavedTranscription = { id: 'test-id' };
      mockDataStore.save.mockResolvedValue(mockSavedTranscription as any);

      const createData = {
        title: '  Spaced Title  ',
        source: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        author: 'testuser',
        userLastUpdated: 'testuser'
      };

      await transcriptionService.create(createData);

      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Spaced Title'
        })
      );
    });

    it('should set default values for new transcription', async () => {
      const mockSavedTranscription = { id: 'test-id' };
      mockDataStore.save.mockResolvedValue(mockSavedTranscription as any);

      const createData = {
        title: 'Test',
        source: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        author: 'testuser',
        userLastUpdated: 'testuser'
      };

      await transcriptionService.create(createData);

      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: '',
          length: 0,
          coverage: 0,
          disableAnalyzer: false,
          isPrivate: true,
          dateLastUpdated: expect.any(String)
        })
      );
    });

    it('should propagate DataStore save errors', async () => {
      const error = new Error('Save failed');
      mockDataStore.save.mockRejectedValue(error);

      const createData = {
        title: 'Test',
        source: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        author: 'testuser',
        userLastUpdated: 'testuser'
      };

      await expect(transcriptionService.create(createData)).rejects.toThrow('Save failed');
    });
  });

  describe('fetchPeaksData retry logic', () => {
    beforeEach(() => {
      // Clear any spies on console methods to avoid testing them
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return peaks data on successful first attempt', async () => {
      const mockPeaksData = [1, 2, 3, 4, 5];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockPeaksData })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Access the private fetchPeaksData function through loadInFull
      // We'll test it indirectly by mocking the transcription query
      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);
      
      // Mock the other service calls used by loadInFull
      jest.mock('./regionService', () => ({
        loadRegionsForTranscription: jest.fn().mockResolvedValue([])
      }));
      jest.mock('./issueService', () => ({
        loadIssuesForTranscription: jest.fn().mockResolvedValue([])
      }));

      const result = await transcriptionService.loadInFull('test-id');

      expect(fetch).toHaveBeenCalledWith('https://example.com/audio.mp3.json');
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.peaks).toEqual(mockPeaksData);
      }
    });

    it('should handle peaks data without wrapper object', async () => {
      const mockPeaksData = [1, 2, 3, 4, 5];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPeaksData) // Direct array, no wrapper
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);

      const result = await transcriptionService.loadInFull('test-id');

      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.peaks).toEqual(mockPeaksData);
      }
    });

    it('should retry on 403 errors and eventually succeed', async () => {
      const mockPeaksData = [1, 2, 3, 4, 5];
      
      // First call returns 403, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: mockPeaksData })
        } as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await transcriptionService.loadInFull('test-id');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBe(false);
      if (result !== false) {
        expect(result.peaks).toEqual(mockPeaksData);
      }
    });

    it('should retry on 404 errors', async () => {
      const mockPeaksData = [1, 2, 3, 4, 5];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: mockPeaksData })
        } as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await transcriptionService.loadInFull('test-id');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.peaks).toEqual(mockPeaksData);
    });

    it('should fail immediately on non-retryable errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);

      await expect(transcriptionService.loadInFull('test-id')).rejects.toThrow(
        'Failed to load peaks data: 500 Internal Server Error'
      );

      expect(fetch).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should fail after maximum retries exhausted', async () => {
      // Mock consistent 403 responses
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(transcriptionService.loadInFull('test-id')).rejects.toThrow(
        /Failed to load peaks data after .* attempts/
      );

      // Should have tried maximum times (default is 10 + 1 initial = 11 total)
      expect(fetch).toHaveBeenCalledTimes(11);
    });

    it('should handle network errors during retry', async () => {
      const networkError = new Error('Network error');
      const mockPeaksData = [1, 2, 3, 4, 5];
      
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: mockPeaksData })
        } as any);

      const mockTranscription = {
        id: 'test-id',
        source: 'https://example.com/audio.mp3'
      };
      
      jest.spyOn(DataStore, 'query').mockResolvedValue(mockTranscription as any);
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await transcriptionService.loadInFull('test-id');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.peaks).toEqual(mockPeaksData);
    });
  });
}); 