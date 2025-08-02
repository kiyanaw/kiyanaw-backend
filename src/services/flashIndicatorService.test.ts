import { flashIndicatorService, FLASH_CONFIG } from './flashIndicatorService';
import { wavesurferService } from './wavesurferService';

// Mock wavesurfer service
jest.mock('./wavesurferService', () => ({
  wavesurferService: {
    flashRegionBackground: jest.fn(),
  },
}));

// Mock DOM methods
let mockGetElementById: jest.SpyInstance;
let mockGetComputedStyle: jest.SpyInstance;

describe('flashIndicatorService', () => {
  let mockElement: HTMLElement;
  let mockWavesurferFlash: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    flashIndicatorService.clearAll();
    
    // Setup DOM spies
    mockGetElementById = jest.spyOn(document, 'getElementById');
    mockGetComputedStyle = jest.spyOn(window, 'getComputedStyle');
    
    // Create mock element
    mockElement = {
      style: {
        transition: '',
        backgroundColor: '',
      },
    } as unknown as HTMLElement;
    
    mockGetElementById.mockReturnValue(mockElement);
    mockGetComputedStyle.mockReturnValue({
      backgroundColor: 'rgba(255, 255, 255, 1)', // default white
    } as CSSStyleDeclaration);
    
    mockWavesurferFlash = jest.mocked(wavesurferService.flashRegionBackground);
  });

  afterEach(() => {
    // Restore DOM spies
    mockGetElementById.mockRestore();
    mockGetComputedStyle.mockRestore();
  });

  describe('FLASH_CONFIG', () => {
    it('should have consistent timing values', () => {
      expect(FLASH_CONFIG.textFadeDuration).toBe(300);
      expect(FLASH_CONFIG.usernameFadeDuration).toBe(300);
      expect(FLASH_CONFIG.textEasing).toBe('ease-out');
      expect(FLASH_CONFIG.usernameEasing).toBe('ease-out');
      expect(FLASH_CONFIG.backgroundEasing).toBe('ease-out');
    });

    it('should have expected color values', () => {
      expect(FLASH_CONFIG.flashColor).toBe('rgba(34, 197, 94, 0.2)');
      expect(FLASH_CONFIG.textColor).toBe('#15803d');
    });
  });

  describe('flashRegion', () => {
    it('should extract username from email and trigger all flash effects', () => {
      const regionId = 'test-region-123';
      const userEmail = 'testuser@example.com';
      const expectedUsername = 'testuser';

      // Setup callback
      const mockCallback = jest.fn();
      flashIndicatorService.onFlash(regionId, mockCallback);

      // Execute flash
      flashIndicatorService.flashRegion(regionId, userEmail);

      // Should trigger text flash callback
      expect(mockCallback).toHaveBeenCalledWith(expectedUsername);
      
      // Should trigger wavesurfer background flash  
      expect(mockWavesurferFlash).toHaveBeenCalledWith(regionId, expectedUsername);
      
      // Should find and flash the region element
      expect(mockGetElementById).toHaveBeenCalledWith(`regionitem-${regionId}`);
    });

    it('should handle username without email domain', () => {
      const regionId = 'test-region-456';
      const username = 'plainusername';
      
      const mockCallback = jest.fn();
      flashIndicatorService.onFlash(regionId, mockCallback);

      flashIndicatorService.flashRegion(regionId, username);

      expect(mockCallback).toHaveBeenCalledWith(username);
      expect(mockWavesurferFlash).toHaveBeenCalledWith(regionId, username);
    });

    it('should not trigger callbacks when no listeners exist', () => {
      const regionId = 'test-region-no-listeners';
      const userEmail = 'test@example.com';

      // No listeners registered, should not throw
      expect(() => {
        flashIndicatorService.flashRegion(regionId, userEmail);
      }).not.toThrow();

      // Should still trigger wavesurfer flash
      expect(mockWavesurferFlash).toHaveBeenCalledWith(regionId, 'test');
    });
  });

  describe('onFlash listener management', () => {
    it('should register and trigger callbacks for specific regions', () => {
      const regionId = 'test-region-listeners';
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      // Register listeners
      const unsubscribe1 = flashIndicatorService.onFlash(regionId, mockCallback1);
      const unsubscribe2 = flashIndicatorService.onFlash(regionId, mockCallback2);

      // Trigger flash
      flashIndicatorService.flashRegion(regionId, 'user@test.com');

      // Both callbacks should be called
      expect(mockCallback1).toHaveBeenCalledWith('user');
      expect(mockCallback2).toHaveBeenCalledWith('user');

      // Unsubscribe and test
      unsubscribe1();
      jest.clearAllMocks();

      flashIndicatorService.flashRegion(regionId, 'user2@test.com');

      // Only second callback should be called
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledWith('user2');

      // Clean up
      unsubscribe2();
    });

    it('should clean up listener maps when all callbacks are removed', () => {
      const regionId = 'test-cleanup';
      const mockCallback = jest.fn();

      const unsubscribe = flashIndicatorService.onFlash(regionId, mockCallback);
      expect(flashIndicatorService.getListenerCount()).toBe(1);

      unsubscribe();
      expect(flashIndicatorService.getListenerCount()).toBe(0);
    });
  });

  describe('region list background flash', () => {
    it('should flash green and restore to normal background', () => {
      const regionId = 'test-background-normal';
      
      // Setup normal (non-blue) background
      mockGetComputedStyle.mockReturnValue({
        backgroundColor: 'rgba(255, 255, 255, 1)', // white
      });

      // Execute flash
      flashIndicatorService.flashRegion(regionId, 'test@example.com');

      // Should apply green flash
      expect(mockElement.style.backgroundColor).toBe(FLASH_CONFIG.flashColor);
      expect(mockElement.style.transition).toBe(`background-color ${FLASH_CONFIG.backgroundFlashDuration}ms ${FLASH_CONFIG.backgroundEasing}`);
    });

    it('should flash green and restore to blue background when selected', () => {
      const regionId = 'test-background-selected';
      
      // Setup blue (selected) background
      mockGetComputedStyle.mockReturnValue({
        backgroundColor: 'rgba(0, 213, 255, 0.1)', // blue selected
      });

      // Execute flash
      flashIndicatorService.flashRegion(regionId, 'test@example.com');

      // Should apply green flash initially
      expect(mockElement.style.backgroundColor).toBe(FLASH_CONFIG.flashColor);
    });

    it('should handle missing region element gracefully', () => {
      const regionId = 'missing-region';
      
      // Mock element not found
      mockGetElementById.mockReturnValue(null);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw
      expect(() => {
        flashIndicatorService.flashRegion(regionId, 'test@example.com');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('⚡ Cannot flash region list background: element not found:', regionId);
      
      consoleSpy.mockRestore();
    });

    it('should handle style computation errors gracefully', () => {
      const regionId = 'error-region';
      
      // Mock getComputedStyle to throw
      mockGetComputedStyle.mockImplementation(() => {
        throw new Error('Style computation failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => {
        flashIndicatorService.flashRegion(regionId, 'test@example.com');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('⚡ Failed to flash region list background:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearAll', () => {
    it('should remove all listeners', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      flashIndicatorService.onFlash('region1', mockCallback1);
      flashIndicatorService.onFlash('region2', mockCallback2);

      expect(flashIndicatorService.getListenerCount()).toBe(2);

      flashIndicatorService.clearAll();

      expect(flashIndicatorService.getListenerCount()).toBe(0);
    });
  });

  describe('getListenerCount', () => {
    it('should return correct count of active listeners', () => {
      expect(flashIndicatorService.getListenerCount()).toBe(0);

      const unsubscribe1 = flashIndicatorService.onFlash('region1', jest.fn());
      const unsubscribe2 = flashIndicatorService.onFlash('region1', jest.fn());
      const unsubscribe3 = flashIndicatorService.onFlash('region2', jest.fn());

      expect(flashIndicatorService.getListenerCount()).toBe(3);

      unsubscribe1();
      expect(flashIndicatorService.getListenerCount()).toBe(2);

      unsubscribe2();
      unsubscribe3();
      expect(flashIndicatorService.getListenerCount()).toBe(0);
    });
  });
}); 