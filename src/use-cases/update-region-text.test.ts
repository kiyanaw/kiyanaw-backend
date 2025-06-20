import { UpdateRegionTextUseCase } from './update-region-text';

describe('UpdateRegionTextUseCase', () => {
  const mockSetRegionText = jest.fn();
  const mockSetRegionTranslation = jest.fn();
  
  const mockStore = {
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
      updateRegion: jest.fn()
    }
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
  });

  describe('save functionality', () => {
    it('should call regionService.updateRegion with correct parameters when user is authenticated', () => {
      const useCase = new UpdateRegionTextUseCase(validConfig);
      
      useCase.execute();
      
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { regionText: 'Test text content' },
        'test-user'
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

    it('should call regionService.updateRegion with translation field', () => {
      const translationConfig = {
        ...validConfig,
        field: 'translation' as const,
        text: 'Translation text'
      };
      
      const useCase = new UpdateRegionTextUseCase(translationConfig);
      
      useCase.execute();
      
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { translation: 'Translation text' },
        'test-user'
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
      
      expect(mockStore.getState).toHaveBeenCalledTimes(1);
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
      
      expect(mockStore.getState).toHaveBeenCalledTimes(1);
      expect(mockSetRegionTranslation).toHaveBeenCalledWith('translation-region-id', 'Translated content');
    });

    it('should work with real store structure', () => {
      // Test with a more realistic store mock structure
      const realisticStore = {
        getState: () => ({
          setRegionText: mockSetRegionText,
          setRegionTranslation: mockSetRegionTranslation,
          regions: [],
          selectedRegionId: null
        })
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
}); 