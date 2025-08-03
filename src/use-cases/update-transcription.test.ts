import { UpdateTranscriptionUseCase } from './update-transcription';
import type { UpdateTranscriptionConfig } from './update-transcription';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';
import { showToast } from '../services/toastService';

// Mock the services and toast
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      updateTranscription: jest.fn(),
    },
    authService: {
      currentUser: jest.fn(() => ({ username: 'test-user@example.com', userId: 'user123' })),
    },
  },
}));

jest.mock('../services/toastService', () => ({
  showToast: jest.fn(),
}));

jest.mock('../services/adt', () => ({
  TranscriptionModel: jest.fn().mockImplementation((data) => data),
}));

const mockServices = services as jest.Mocked<typeof services>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const MockedTranscriptionModel = TranscriptionModel as jest.MockedClass<typeof TranscriptionModel>;

describe('UpdateTranscriptionUseCase', () => {
  const mockStore = {
    transcription: {
      id: 'test-transcription-id',
      title: 'Original Title',
      length: 120,
      userLastUpdated: 'original-user',
      dateLastUpdated: '2023-01-01T00:00:00.000Z',
    },
    regions: [
      { id: 'region1', start: 0, end: 30 },
      { id: 'region2', start: 30, end: 60 },
    ],
    setTranscription: jest.fn(),
    calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 2, coverage: 0.75 })),
  };

  const baseConfig: UpdateTranscriptionConfig = {
    transcriptionId: 'test-transcription-id',
    updates: { title: 'New Title' },
    services: mockServices,
    store: mockStore as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('should throw error when transcriptionId is missing', () => {
      const config = { ...baseConfig, transcriptionId: '' };
      const useCase = new UpdateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required');
    });



    it('should throw error when title is empty string', () => {
      const config = { ...baseConfig, updates: { title: '' } };
      const useCase = new UpdateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('title cannot be empty');
    });

    it('should throw error when title is only whitespace', () => {
      const config = { ...baseConfig, updates: { title: '   ' } };
      const useCase = new UpdateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('title cannot be empty');
    });

    it('should pass validation with valid config', () => {
      const useCase = new UpdateTranscriptionUseCase(baseConfig);
      
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should successfully update transcription and show success toast', async () => {
      const rawTranscription = { id: 'test-id', title: 'New Title', type: 'audio/mp3' };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(rawTranscription);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);
      await useCase.execute();

      expect(mockServices.transcriptionService.updateTranscription).toHaveBeenCalledWith(
        'test-transcription-id',
        expect.objectContaining({
          title: 'New Title',
          userLastUpdated: 'test-user',
          dateLastUpdated: expect.any(String),
        })
      );

      // Verify that the combined data was passed to the store
      expect(mockStore.setTranscription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title',
          userLastUpdated: 'test-user',
          coverage: 0.75,
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Transcription saved', 'success');
    });

    it('should update both title and comments', async () => {
      const config = {
        ...baseConfig,
        updates: { title: 'New Title', comments: 'New comments' },
      };

      const rawTranscription = { id: 'test-id', title: 'New Title', comments: 'New comments', type: 'video/mp4' };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(rawTranscription);

      const useCase = new UpdateTranscriptionUseCase(config);
      await useCase.execute();

      expect(mockServices.transcriptionService.updateTranscription).toHaveBeenCalledWith(
        'test-transcription-id',
        expect.objectContaining({
          title: 'New Title',
          comments: 'New comments',
          userLastUpdated: 'test-user',
          dateLastUpdated: expect.any(String),
        })
      );

      // Verify that the combined data was passed to the store
      expect(mockStore.setTranscription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title',
          comments: 'New comments',
          userLastUpdated: 'test-user',
          coverage: 0.75,
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Transcription saved', 'success');
    });

    it('should handle errors and show error toast', async () => {
      const error = new Error('Network error');
      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockRejectedValue(error);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);

      await expect(useCase.execute()).rejects.toThrow('Network error');

      expect(mockShowToast).toHaveBeenCalledWith('Failed to save transcription', 'error');
      // Note: setTranscription is called for optimistic update even if API fails
      expect(mockStore.setTranscription).toHaveBeenCalled();
    });

    it('should pass combined transcription data to store', async () => {
      const apiResponse = { id: 'test-id', title: 'Video Title', type: 'video/mp4' };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(apiResponse);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);
      await useCase.execute();

      // Verify that the combined data (current + updates + metadata) was passed to the store
      expect(mockStore.setTranscription).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-transcription-id',
          title: 'New Title',
          userLastUpdated: 'test-user',
          coverage: 0.75,
        })
      );
    });
  });
}); 