import { getEditorData } from './transcriptionService';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription, Region, Issue } from '../models';

// Mock Amplify services
jest.mock('@aws-amplify/datastore', () => ({
  ...jest.requireActual('@aws-amplify/datastore'),
  DataStore: {
    query: jest.fn(),
  },
}));

const mockDataStoreQuery = DataStore.query as jest.Mock;

describe('transcriptionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEditorData', () => {
    const transcriptionId = 'test-id';
    const mockTranscription = {
      id: transcriptionId,
      title: 'Test Transcription',
      source: 'https://example.com/test.mp4',
      type: 'video/mp4',
    } as unknown as Transcription;

    beforeEach(() => {
      // Reset mocks before each test
      mockDataStoreQuery.mockReset();
      global.fetch = jest.fn();
    });

    it('should fetch and process all data correctly, including peaks', async () => {
      // Arrange
      const mockRegions = [{ id: 'r1', start: 0, end: 1, transcriptionID: transcriptionId }];
      const mockIssues = [{ id: 'i1', description: 'Test issue', transcriptionID: transcriptionId }];
      const mockPeaksData = { data: [0, 1, 2, 3] };

      mockDataStoreQuery
        .mockResolvedValueOnce(mockTranscription) // For Transcription
        .mockResolvedValueOnce(mockRegions as any) // For Regions
        .mockResolvedValueOnce(mockIssues as any); // For Issues

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPeaksData),
      });
      
      // Act
      const result = await getEditorData(transcriptionId);

      // Assert
      expect(DataStore.query).toHaveBeenCalledWith(Transcription, transcriptionId);
      expect(DataStore.query).toHaveBeenCalledWith(Region, expect.any(Function));
      expect(DataStore.query).toHaveBeenCalledWith(Issue, expect.any(Function));
      expect(fetch).toHaveBeenCalledWith('https://example.com/test.mp4.json');
      
      expect(result.transcription).toEqual({ ...mockTranscription, peaks: mockPeaksData.data });
      expect(result.regions).toHaveLength(1);
      expect(result.issues).toHaveLength(1);
      expect(result.peaks).toEqual(mockPeaksData.data);
      expect(result.source).toEqual('https://example.com/test.mp4');
      expect(result.isVideo).toBe(true);
    });

    it('should throw an error if the transcription is not found', async () => {
      // Arrange
      mockDataStoreQuery.mockResolvedValue(undefined);

      // Act & Assert
      await expect(getEditorData(transcriptionId)).rejects.toThrow('Transcription not found');
    });

    it('should continue gracefully if fetching peaks fails', async () => {
      // Arrange
      mockDataStoreQuery
        .mockResolvedValueOnce(mockTranscription)
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([]);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // Act
      const result = await getEditorData(transcriptionId);

      // Assert
      expect(fetch).toHaveBeenCalledWith('https://example.com/test.mp4.json');
      expect(result.transcription).toEqual(mockTranscription);
      expect(result.peaks).toBeUndefined();
    });

    it('should continue gracefully if peaks response is not ok', async () => {
        // Arrange
        mockDataStoreQuery
          .mockResolvedValueOnce(mockTranscription)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
  
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
        
        // Act
        const result = await getEditorData(transcriptionId);
  
        // Assert
        expect(result.transcription).toEqual(mockTranscription);
        expect(result.peaks).toBeUndefined();
      });
  });
}); 