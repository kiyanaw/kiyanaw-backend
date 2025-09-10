import { browserService } from './browserService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('BrowserService Video Preferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getVideoPreferences', () => {
    it('should return default preferences when nothing is stored', () => {
      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'right',
        size: 'small',
        isMinimized: false,
        zoom: 40,
        speed: 100,
      });
    });

    it('should return stored preferences', () => {
      localStorageMock.setItem('kiyanaw-video-preferences', JSON.stringify({
        position: 'left',
        size: 'big',
        isMinimized: true,
        zoom: 60,
        speed: 75,
      }));

      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'left',
        size: 'big',
        isMinimized: true,
        zoom: 60,
        speed: 75,
      });
    });

    it('should return defaults for malformed JSON', () => {
      localStorageMock.setItem('kiyanaw-video-preferences', 'invalid-json');

      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'right',
        size: 'small',
        isMinimized: false,
        zoom: 40,
        speed: 100,
      });
    });
  });

  describe('saveVideoPreferences', () => {
    it('should save partial preferences and merge with existing', () => {
      // Set initial preferences
      browserService.saveVideoPreferences({ position: 'left', size: 'big' });
      
      // Update only position
      browserService.saveVideoPreferences({ position: 'right' });
      
      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'right',
        size: 'big',
        isMinimized: false,
        zoom: 40,
        speed: 100,
      });
    });

    it('should save new preferences when none exist', () => {
      browserService.saveVideoPreferences({ position: 'center', isMinimized: true });
      
      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'center',
        size: 'small',
        isMinimized: true,
        zoom: 40,
        speed: 100,
      });
    });

    it('should save zoom and speed preferences', () => {
      browserService.saveVideoPreferences({ zoom: 65, speed: 85 });
      
      const preferences = browserService.getVideoPreferences();
      expect(preferences).toEqual({
        position: 'right',
        size: 'small',
        isMinimized: false,
        zoom: 65,
        speed: 85,
      });
    });
  });
}); 