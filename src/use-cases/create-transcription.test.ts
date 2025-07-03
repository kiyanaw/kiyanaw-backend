import { CreateTranscriptionUseCase } from './create-transcription';

// Mock file for testing
const createMockFile = (name: string = 'test.mp3', type: string = 'audio/mpeg'): File => {
  return new File(['mock content'], name, { type });
};

describe('CreateTranscriptionUseCase', () => {
  const mockServices = {
    uploadService: {
      uploadFile: jest.fn(),
      constructPublicUrl: jest.fn()
    },
    transcriptionService: {
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('should validate all required fields are present', () => {
      const config = {
        title: 'Test Title',
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when title is missing', () => {
      const config = {
        title: '',
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Title is required');
    });

    it('should throw error when title is only whitespace', () => {
      const config = {
        title: '   ',
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Title is required');
    });

    it('should throw error when file is missing', () => {
      const config = {
        title: 'Test Title',
        file: null as any,
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('File is required');
    });

    it('should throw error when username is missing', () => {
      const config = {
        title: 'Test Title',
        file: createMockFile(),
        username: '',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('Username is required');
    });

    it('should throw error when userId is missing', () => {
      const config = {
        title: 'Test Title',
        file: createMockFile(),
        username: 'testuser',
        userId: '',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      expect(() => useCase.validate()).toThrow('User ID is required');
    });
  });

  describe('execute', () => {
    it('should orchestrate the complete transcription creation workflow', async () => {
      const mockFile = createMockFile('test-audio.mp3', 'audio/mpeg');
      const mockTranscription = { id: 'transcription-id', title: 'Test Title' };

      mockServices.uploadService.uploadFile.mockResolvedValue('file-key.mp3');
      mockServices.uploadService.constructPublicUrl.mockReturnValue('https://example.com/file-key.mp3');
      mockServices.transcriptionService.create.mockResolvedValue(mockTranscription);

      const config = {
        title: 'Test Title',
        file: mockFile,
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      const result = await useCase.execute();

      // Verify upload service was called
      expect(mockServices.uploadService.uploadFile).toHaveBeenCalledWith(mockFile, {
        onProgress: undefined
      });

      // Verify URL construction
      expect(mockServices.uploadService.constructPublicUrl).toHaveBeenCalledWith('file-key.mp3');

      // Verify transcription creation
      expect(mockServices.transcriptionService.create).toHaveBeenCalledWith({
        title: 'Test Title',
        source: 'https://example.com/file-key.mp3',
        type: 'audio/mpeg',
        author: 'testuser',
        userLastUpdated: 'testuser'
      });

      // Verify result
      expect(result).toEqual({
        transcriptionId: 'transcription-id',
        transcription: mockTranscription
      });
    });

    it('should call validation before executing', async () => {
      const config = {
        title: '', // Invalid
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Title is required');
      
      // Should not call any services if validation fails
      expect(mockServices.uploadService.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle progress callback', async () => {
      const progressCallback = jest.fn();
      const mockFile = createMockFile();
      const mockTranscription = { id: 'transcription-id', title: 'Test' };

      mockServices.uploadService.uploadFile.mockResolvedValue('file-key');
      mockServices.uploadService.constructPublicUrl.mockReturnValue('https://example.com/file');
      mockServices.transcriptionService.create.mockResolvedValue(mockTranscription);

      const config = {
        title: 'Test',
        file: mockFile,
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any,
        onProgress: progressCallback
      };

      const useCase = new CreateTranscriptionUseCase(config);
      await useCase.execute();

      expect(mockServices.uploadService.uploadFile).toHaveBeenCalledWith(mockFile, {
        onProgress: progressCallback
      });
    });

    it('should handle upload service errors', async () => {
      const uploadError = new Error('Upload failed');
      mockServices.uploadService.uploadFile.mockRejectedValue(uploadError);

      const config = {
        title: 'Test Title',
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Upload failed');
    });

    it('should handle transcription creation errors', async () => {
      const transcriptionError = new Error('Transcription creation failed');
      
      mockServices.uploadService.uploadFile.mockResolvedValue('file-key');
      mockServices.uploadService.constructPublicUrl.mockReturnValue('https://example.com/file');
      mockServices.transcriptionService.create.mockRejectedValue(transcriptionError);

      const config = {
        title: 'Test Title',
        file: createMockFile(),
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Transcription creation failed');
    });



    it('should work with different file types', async () => {
      const videoFile = createMockFile('video.mp4', 'video/mp4');
      const mockTranscription = { id: 'transcription-id' };

      mockServices.uploadService.uploadFile.mockResolvedValue('video-key.mp4');
      mockServices.uploadService.constructPublicUrl.mockReturnValue('https://example.com/video-key.mp4');
      mockServices.transcriptionService.create.mockResolvedValue(mockTranscription);

      const config = {
        title: 'Video Test',
        file: videoFile,
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      await useCase.execute();

      expect(mockServices.transcriptionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'video/mp4',
          source: 'https://example.com/video-key.mp4'
        })
      );
    });
  });

  describe('Use Case Architecture Compliance', () => {
    it('should be stateless - multiple instances should not interfere', async () => {
      const mockTranscription1 = { id: 'transcription-1' };
      const mockTranscription2 = { id: 'transcription-2' };

      mockServices.uploadService.uploadFile
        .mockResolvedValueOnce('file-1')
        .mockResolvedValueOnce('file-2');
      mockServices.uploadService.constructPublicUrl
        .mockReturnValueOnce('https://example.com/file-1')
        .mockReturnValueOnce('https://example.com/file-2');
      mockServices.transcriptionService.create
        .mockResolvedValueOnce(mockTranscription1)
        .mockResolvedValueOnce(mockTranscription2);

      const config1 = {
        title: 'Test 1',
        file: createMockFile('file1.mp3'),
        username: 'user1',
        userId: 'user-id-1',
        services: mockServices as any
      };

      const config2 = {
        title: 'Test 2',
        file: createMockFile('file2.mp3'),
        username: 'user2',
        userId: 'user-id-2',
        services: mockServices as any
      };

      const useCase1 = new CreateTranscriptionUseCase(config1);
      const useCase2 = new CreateTranscriptionUseCase(config2);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.transcriptionId).toBe('transcription-1');
      expect(result2.transcriptionId).toBe('transcription-2');
    });

    it('should not mutate input configuration', async () => {
      const originalFile = createMockFile('original.mp3');
      const originalTitle = 'Original Title';
      
      mockServices.uploadService.uploadFile.mockResolvedValue('file-key');
      mockServices.uploadService.constructPublicUrl.mockReturnValue('https://example.com/file');
      mockServices.transcriptionService.create.mockResolvedValue({ id: 'transcription-id' });

      const config = {
        title: originalTitle,
        file: originalFile,
        username: 'testuser',
        userId: 'user-id',
        services: mockServices as any
      };

      const useCase = new CreateTranscriptionUseCase(config);
      await useCase.execute();

      expect(config.title).toBe(originalTitle);
      expect(config.file).toBe(originalFile);
    });
  });
}); 