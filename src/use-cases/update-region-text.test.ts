import { UpdateRegionTextUseCase } from './update-region-text';

describe('UpdateRegionTextUseCase', () => {
  const mockSetRegionText = jest.fn();
  const mockSetRegionTranslation = jest.fn();
  
  const mockStore = {
    setRegionText: mockSetRegionText,
    setRegionTranslation: mockSetRegionTranslation,
    getRegionVersion: jest.fn().mockReturnValue(7),
    regionById: jest.fn().mockImplementation((regionId) => ({
      id: regionId,
      regionText: 'existing text',
      translation: 'existing translation',
      transcriptionId: 'test-transcription-id',
      _version: 7
    })),
    setRegionVersion: jest.fn(),
    regionMap: {
      'test-region-id': {
        id: 'test-region-id',
        regionText: 'existing text',
        translation: 'existing translation',
        transcriptionId: 'test-transcription-id',
        _version: 7
      }
    },
    transcription: {
      id: 'test-transcription-id',
      title: 'Test Transcription'
    },
    calculateTranscriptionMetadata: jest.fn().mockReturnValue({ coverage: 0.5 }),
    setTranscription: jest.fn(),
    setSaveStatus: jest.fn(),
    getState: jest.fn().mockReturnValue({
      setRegionText: mockSetRegionText,
      setRegionTranslation: mockSetRegionTranslation
    })
  } as any; // Type assertion to bypass strict typing for testing

  const mockServices = {
    authService: {
      currentUser: jest.fn().mockReturnValue({ username: 'test-user' })
    },
    regionService: {
      updateRegion: jest.fn(),
      getRegion: jest.fn(),
    },
    conflictDetectionService: {
      detectConflict: jest.fn()
    },
    conflictResolutionService: {
      showConflictDialog: jest.fn()
    },
    storeService: {
      startPendingEdit: jest.fn(),
      endPendingEdit: jest.fn(),
      regionById: jest.fn().mockImplementation((regionId) => ({
        id: regionId,
        regionText: 'existing text',
        translation: 'existing translation',
        transcriptionId: 'test-transcription-id',
        _version: 7
      })),
      getRegionVersion: jest.fn().mockReturnValue(7),
      setRegionText: mockSetRegionText,
      setRegionTranslation: mockSetRegionTranslation,
      setRegionVersion: jest.fn(),
      getBaselineForRegion: jest.fn().mockReturnValue(null),
    },
    transcriptionService: {
      updateTranscription: jest.fn().mockResolvedValue({}),
    },
    userService: {
      currentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
    },
  } as any;

  const validConfig = {
    regionId: 'test-region-id',
    text: 'Test text content',
    field: 'regionText' as const,
    store: mockStore,
    services: mockServices
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('save functionality', () => {
    it('should call regionService.updateRegion with correct parameters when user is authenticated', async () => {
      mockStore.getRegionVersion.mockReturnValue(7); // Mock version
      
      const useCase = new UpdateRegionTextUseCase(validConfig);
      
      useCase.execute();
      
      // Should not call immediately (debounced)
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
      
      // Advance timers to trigger the debounced save
      jest.advanceTimersByTime(3000);
      
      // Wait for async operations to complete
      await jest.runAllTimersAsync();
      
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { regionText: 'Test text content' },
        'test-user',
        7
      );
    });

    it('should not call regionService.updateRegion when user is not authenticated', () => {
      const configWithoutUser = {
        ...validConfig,
        services: {
          ...mockServices,
          authService: {
            currentUser: jest.fn().mockReturnValue(null)
          }
        }
      };
      
      const useCase = new UpdateRegionTextUseCase(configWithoutUser);
      
      useCase.execute();
      
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
    });

    it('should call regionService.updateRegion with translation field', async () => {
      mockStore.getRegionVersion.mockReturnValue(4); // Mock version
      
      const translationConfig = {
        ...validConfig,
        field: 'translation' as const,
        text: 'Translation text'
      };
      
      const useCase = new UpdateRegionTextUseCase(translationConfig);
      
      useCase.execute();
      
      // Should not call immediately (debounced)
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
      
      // Advance timers to trigger the debounced save
      jest.advanceTimersByTime(3000);
      
      // Wait for async operations to complete
      await jest.runAllTimersAsync();
      
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { translation: 'Translation text' },
        'test-user',
        4
      );
    });
  });

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      expect(useCase).toBeInstanceOf(UpdateRegionTextUseCase);
    });
  });

  describe('validate', () => {
    it('should pass when regionId is provided', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should fail when regionId is empty string', () => {
      const configWithEmptyRegionId = {
        ...validConfig,
        regionId: ''
      };

      const useCase = new UpdateRegionTextUseCase(configWithEmptyRegionId);
      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should fail when regionId is undefined', () => {
      const configWithUndefinedRegionId = {
        ...validConfig,
        regionId: undefined as any
      };

      const useCase = new UpdateRegionTextUseCase(configWithUndefinedRegionId);
      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should fail when regionId is null', () => {
      const configWithNullRegionId = {
        ...validConfig,
        regionId: null as any
      };

      const useCase = new UpdateRegionTextUseCase(configWithNullRegionId);
      expect(() => useCase.validate()).toThrow('regionId is required');
    });
  });

  describe('execute', () => {
    it('should call validate before execution', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should call setRegionText when field is regionText', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledTimes(1);
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', 'Test text content');
      expect(mockSetRegionTranslation).not.toHaveBeenCalled();
    });

    it('should call setRegionTranslation when field is translation', () => {
      const translationConfig = {
        ...validConfig,
        field: 'translation' as const,
        text: 'Test translation content'
      };
      
      const useCase = new UpdateRegionTextUseCase(translationConfig);
      
      useCase.execute();
      
      expect(mockSetRegionTranslation).toHaveBeenCalledTimes(1);
      expect(mockSetRegionTranslation).toHaveBeenCalledWith('test-region-id', 'Test translation content');
      expect(mockSetRegionText).not.toHaveBeenCalled();
    });

    it('should handle empty text content', () => {
      const emptyTextConfig = {
        ...validConfig,
        text: ''
      };
      
      const useCase = new UpdateRegionTextUseCase(emptyTextConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', '');
    });

    it('should handle whitespace-only text content', () => {
      const whitespaceConfig = {
        ...validConfig,
        text: '   \n\t   '
      };
      
      const useCase = new UpdateRegionTextUseCase(whitespaceConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', '   \n\t   ');
    });

    it('should handle long text content', () => {
      const longText = 'A'.repeat(1000);
      const longTextConfig = {
        ...validConfig,
        text: longText
      };
      
      const useCase = new UpdateRegionTextUseCase(longTextConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', longText);
    });

    it('should handle special characters in text', () => {
      const specialText = 'Text with émojis 🎉 and symbols: @#$%^&*()';
      const specialTextConfig = {
        ...validConfig,
        text: specialText
      };
      
      const useCase = new UpdateRegionTextUseCase(specialTextConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', specialText);
    });

    it('should work with different regionIds', () => {
      const differentRegionConfig = {
        ...validConfig,
        regionId: 'different-region-123'
      };
      
      const useCase = new UpdateRegionTextUseCase(differentRegionConfig);
      
      useCase.execute();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('different-region-123', 'Test text content');
    });
  });

  describe('error handling', () => {
    it('should throw validation error before calling store methods', () => {
      const invalidConfig = {
        ...validConfig,
        regionId: ''
      };
      
      const useCase = new UpdateRegionTextUseCase(invalidConfig);
      
      expect(() => useCase.execute()).toThrow('regionId is required');
      expect(mockSetRegionText).not.toHaveBeenCalled();
      expect(mockSetRegionTranslation).not.toHaveBeenCalled();
    });

    it('should propagate store errors', () => {
      const storeError = new Error('Store update failed');
      mockSetRegionText.mockImplementation(() => {
        throw storeError;
      });
      
      const useCase = new UpdateRegionTextUseCase(validConfig);
      
      expect(() => useCase.execute()).toThrow('Store update failed');
      
      // Reset the mock after the test
      mockSetRegionText.mockReset();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete regionText update flow', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      
      expect(() => useCase.execute()).not.toThrow();
      
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', 'Test text content');
    });

    it('should handle complete translation update flow', () => {
      const translationConfig = {
        regionId: 'translation-region-id',
        text: 'Translated content',
        field: 'translation' as const,
        store: mockStore,
        services: mockServices
      };
      
      const useCase = new UpdateRegionTextUseCase(translationConfig);
      
      expect(() => useCase.execute()).not.toThrow();
      
      expect(mockSetRegionTranslation).toHaveBeenCalledWith('translation-region-id', 'Translated content');
    });

    it('should work with real store structure', () => {
      // Test with a more realistic store mock structure
      const realisticStore = {
        setRegionText: mockSetRegionText,
        setRegionTranslation: mockSetRegionTranslation,
        regionById: jest.fn((regionId) => ({ 
          id: regionId,
          transcriptionId: 'test-transcription-id', 
          regionAnalysis: [{ word: 'word1', analysis: 'word1+N', allAnalysis: ['word1+N'] }, { word: 'word2', analysis: 'word2+N', allAnalysis: ['word2+N'] }],
          regionText: 'existing text',
          _version: 7
        })),
        regions: [],
        selectedRegionId: null
      } as any; // Type assertion for testing
      
      const realisticConfig = {
        ...validConfig,
        store: realisticStore
      };
      
      const useCase = new UpdateRegionTextUseCase(realisticConfig);
      
      expect(() => useCase.execute()).not.toThrow();
      expect(mockSetRegionText).toHaveBeenCalledWith('test-region-id', 'Test text content');
    });
  });

    // Note: Simplified conflict resolution tests removed - feature not yet implemented
}); 