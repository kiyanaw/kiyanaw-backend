import { SubscribeToRegionChangesUseCase } from './subscribe-to-region-changes';
import type { RegionData } from '../services/adt';

// Mock services
const mockServices = {
  regionService: {
    subscribeToRegionChanges: jest.fn()
  },
  storeService: {
    addNewRegion: jest.fn(),
    deleteRegion: jest.fn(),
    regionById: jest.fn(),
    updateRegionBounds: jest.fn(),
    setRegionAnalysis: jest.fn(),
    addKnownWords: jest.fn(),
    setRegionText: jest.fn(),
    setRegionTranslation: jest.fn()
  },
  wavesurferService: {
    addRegionWithId: jest.fn(),
    deleteRegion: jest.fn(),
    setRegionPosition: jest.fn()
  },
  flashIndicatorService: {
    flashRegion: jest.fn()
  },
  userService: {
    currentUser: jest.fn()
  },
  rteService: {
    hasEditor: jest.fn(),
    setContent: jest.fn(),
    applyKnownWordsFormatting: jest.fn()
  }
} as any;

describe('SubscribeToRegionChangesUseCase', () => {
  let useCase: SubscribeToRegionChangesUseCase;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnsubscribe = jest.fn();
    mockServices.regionService.subscribeToRegionChanges.mockReturnValue(mockUnsubscribe);
    
    useCase = new SubscribeToRegionChangesUseCase({
      transcriptionId: 'test-transcription',
      services: mockServices
    });
  });

  describe('validation', () => {
    it('should throw error if transcriptionId is empty', () => {
      const useCaseWithEmptyId = new SubscribeToRegionChangesUseCase({
        transcriptionId: '',
        services: mockServices
      });

      expect(() => useCaseWithEmptyId.validate()).toThrow('transcriptionId is required');
    });

    it('should throw error if transcriptionId is whitespace', () => {
      const useCaseWithWhitespace = new SubscribeToRegionChangesUseCase({
        transcriptionId: '   ',
        services: mockServices
      });

      expect(() => useCaseWithWhitespace.validate()).toThrow('transcriptionId is required');
    });

    it('should not throw error for valid transcriptionId', () => {
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should set up subscription with correct transcriptionId', () => {
      useCase.execute();

      expect(mockServices.regionService.subscribeToRegionChanges).toHaveBeenCalledWith(
        'test-transcription',
        expect.any(Function)
      );
    });

    it('should return unsubscribe function', () => {
      const result = useCase.execute();

      expect(result).toBe(mockUnsubscribe);
    });
  });

  describe('event handling', () => {
    let subscriptionCallback: (event: any) => void;

    beforeEach(() => {
      useCase.execute();
      subscriptionCallback = mockServices.regionService.subscribeToRegionChanges.mock.calls[0][1];
    });

    describe('self-event filtering', () => {
      it('should ignore events from current user', () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'UPDATE',
          region: {
            id: 'region-1',
            userLastUpdated: 'current@user.com'
          }
        };

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).not.toHaveBeenCalled();
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
      });

      it('should process events from other users', () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'UPDATE',
          region: {
            id: 'region-1',
            userLastUpdated: 'other@user.com',
            regionText: 'new text'
          }
        };

        mockServices.storeService.regionById.mockReturnValue({
          id: 'region-1',
          regionText: 'old text'
        });

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });
    });

    describe('flash indicator triggering', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
      });

      it('should trigger flash for CREATE events', () => {
        const event = {
          mutation: 'CREATE',
          region: {
            id: 'region-1',
            userLastUpdated: 'other@user.com'
          }
        };

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should trigger flash for UPDATE events', () => {
        const event = {
          mutation: 'UPDATE',
          region: {
            id: 'region-1',
            userLastUpdated: 'other@user.com'
          }
        };

        mockServices.storeService.regionById.mockReturnValue({ id: 'region-1' });

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should trigger flash for DELETE events', () => {
        const event = {
          mutation: 'DELETE',
          region: {
            id: 'region-1',
            userLastUpdated: 'other@user.com'
          }
        };

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should not trigger flash if userLastUpdated is missing', () => {
        const event = {
          mutation: 'UPDATE',
          region: {
            id: 'region-1'
            // userLastUpdated missing
          }
        };

        mockServices.storeService.regionById.mockReturnValue({ id: 'region-1' });

        subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).not.toHaveBeenCalled();
      });
    });

    describe('CREATE event handling', () => {
      it('should add region to store and wavesurfer', () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const region = {
          id: 'region-1',
          start: 10,
          end: 20,
          userLastUpdated: 'other@user.com'
        };

        const event = { mutation: 'CREATE', region };

        subscriptionCallback(event);

        expect(mockServices.storeService.addNewRegion).toHaveBeenCalledWith(region);
        expect(mockServices.wavesurferService.addRegionWithId).toHaveBeenCalledWith({
          id: 'region-1',
          start: 10,
          end: 20
        });
      });
    });

    describe('DELETE event handling', () => {
      it('should remove region from store and wavesurfer', () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'DELETE',
          region: {
            id: 'region-1',
            userLastUpdated: 'other@user.com'
          }
        };

        subscriptionCallback(event);

        expect(mockServices.storeService.deleteRegion).toHaveBeenCalledWith('region-1');
        expect(mockServices.wavesurferService.deleteRegion).toHaveBeenCalledWith('region-1');
      });
    });

    describe('UPDATE event handling', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
      });

      it('should handle bounds changes', () => {
        const currentRegion = { id: 'region-1', start: 10, end: 20 };
        const updatedRegion = { 
          id: 'region-1', 
          start: 15, 
          end: 25, 
          userLastUpdated: 'other@user.com' 
        };

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        subscriptionCallback(event);

        expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 15, 25);
        expect(mockServices.wavesurferService.setRegionPosition).toHaveBeenCalledWith('region-1', {
          start: 15,
          end: 25
        });
      });

      it('should handle region analysis updates', () => {
        const currentRegion = { id: 'region-1' };
        const updatedRegion = { 
          id: 'region-1',
          regionAnalysis: ['word1', 'word2'],
          userLastUpdated: 'other@user.com'
        };

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        subscriptionCallback(event);

        expect(mockServices.storeService.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['word1', 'word2']);
        expect(mockServices.storeService.addKnownWords).toHaveBeenCalledWith(['word1', 'word2']);
      });

      it('should handle text changes and update RTE if available', () => {
        const currentRegion = { id: 'region-1', regionText: 'old text' };
        const updatedRegion = { 
          id: 'region-1',
          regionText: 'new text',
          regionAnalysis: ['word1'],
          userLastUpdated: 'other@user.com'
        };

        mockServices.storeService.regionById.mockReturnValue(currentRegion);
        mockServices.rteService.hasEditor.mockReturnValue(true);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        subscriptionCallback(event);

        expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'new text');
        expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:main');
        expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:main', 'new text');
        expect(mockServices.rteService.applyKnownWordsFormatting).toHaveBeenCalledWith('region-1:main', ['word1']);
      });

      it('should handle translation changes', () => {
        const currentRegion = { id: 'region-1', translation: 'old translation' };
        const updatedRegion = { 
          id: 'region-1',
          translation: 'new translation',
          userLastUpdated: 'other@user.com'
        };

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        subscriptionCallback(event);

        expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'new translation');
      });

      it('should warn and return early for unknown region', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        mockServices.storeService.regionById.mockReturnValue(null);

        const event = {
          mutation: 'UPDATE',
          region: {
            id: 'unknown-region',
            userLastUpdated: 'other@user.com'
          }
        };

        subscriptionCallback(event);

        expect(consoleSpy).toHaveBeenCalledWith('🔌 Received UPDATE for unknown region:', 'unknown-region');
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    it('should warn for unknown mutation types', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

      const event = {
        mutation: 'UNKNOWN',
        region: {
          id: 'region-1',
          userLastUpdated: 'other@user.com'
        }
      };

      subscriptionCallback(event);

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Unknown mutation type:', 'UNKNOWN');

      consoleSpy.mockRestore();
    });
  });
}); 