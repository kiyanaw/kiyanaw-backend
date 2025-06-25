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
    setTranscription: jest.fn(),
  };

  const baseConfig: UpdateTranscriptionConfig = {
    transcriptionId: 'test-transcription-id',
    updates: { title: 'New Title' },
    username: 'testuser',
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

    it('should throw error when username is missing', () => {
      const config = { ...baseConfig, username: '' };
      const useCase = new UpdateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('username is required');
    });

    it('should throw error when updates are empty', () => {
      const config = { ...baseConfig, updates: {} };
      const useCase = new UpdateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('updates are required');
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
      const transcriptionModel = { id: 'test-id', title: 'New Title', isVideo: false };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(rawTranscription);
      MockedTranscriptionModel.mockReturnValue(transcriptionModel as any);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);
      await useCase.execute();

      expect(mockServices.transcriptionService.updateTranscription).toHaveBeenCalledWith(
        'test-transcription-id',
        {
          title: 'New Title',
          userLastUpdated: 'testuser',
        }
      );

      expect(MockedTranscriptionModel).toHaveBeenCalledWith(rawTranscription);
      expect(mockStore.setTranscription).toHaveBeenCalledWith(transcriptionModel);
      expect(mockShowToast).toHaveBeenCalledWith('Transcription saved', 'success');
    });

    it('should update both title and comments', async () => {
      const config = {
        ...baseConfig,
        updates: { title: 'New Title', comments: 'New comments' },
      };

      const rawTranscription = { id: 'test-id', title: 'New Title', comments: 'New comments', type: 'video/mp4' };
      const transcriptionModel = { id: 'test-id', title: 'New Title', comments: 'New comments', isVideo: true };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(rawTranscription);
      MockedTranscriptionModel.mockReturnValue(transcriptionModel as any);

      const useCase = new UpdateTranscriptionUseCase(config);
      await useCase.execute();

      expect(mockServices.transcriptionService.updateTranscription).toHaveBeenCalledWith(
        'test-transcription-id',
        {
          title: 'New Title',
          comments: 'New comments',
          userLastUpdated: 'testuser',
        }
      );

      expect(mockStore.setTranscription).toHaveBeenCalledWith(transcriptionModel);
      expect(mockShowToast).toHaveBeenCalledWith('Transcription saved', 'success');
    });

    it('should handle errors and show error toast', async () => {
      const error = new Error('Network error');
      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockRejectedValue(error);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);

      await expect(useCase.execute()).rejects.toThrow('Network error');

      expect(mockShowToast).toHaveBeenCalledWith('Failed to save transcription', 'error');
      expect(mockStore.setTranscription).not.toHaveBeenCalled();
    });

    it('should preserve TranscriptionModel properties like isVideo', async () => {
      const rawTranscription = { id: 'test-id', title: 'Video Title', type: 'video/mp4' };
      const transcriptionModel = { id: 'test-id', title: 'Video Title', isVideo: true };

      (mockServices.transcriptionService.updateTranscription as jest.Mock).mockResolvedValue(rawTranscription);
      MockedTranscriptionModel.mockReturnValue(transcriptionModel as any);

      const useCase = new UpdateTranscriptionUseCase(baseConfig);
      await useCase.execute();

      // Verify that TranscriptionModel constructor was called with raw data
      expect(MockedTranscriptionModel).toHaveBeenCalledWith(rawTranscription);
      
      // Verify that the model instance (with computed properties) was stored
      expect(mockStore.setTranscription).toHaveBeenCalledWith(transcriptionModel);
    });
  });
}); 