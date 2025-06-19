import { browserService } from './browserService';

// Mock browser APIs
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();

// Mock window object
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: mockReplaceState,
  },
  writable: true,
});

describe('BrowserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = browserService;
      const instance2 = browserService;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('URL Management', () => {
    describe('updateUrl', () => {
      it('should call history.pushState with correct parameters', () => {
        const testPath = '/test/path';
        
        browserService.updateUrl(testPath);
        
        expect(mockPushState).toHaveBeenCalledWith(null, '', testPath);
      });

      it('should handle complex URLs', () => {
        const complexPath = '/transcribe-edit/abc123/region456';
        
        browserService.updateUrl(complexPath);
        
        expect(mockPushState).toHaveBeenCalledWith(null, '', complexPath);
      });

      it('should not crash when window is undefined', () => {
        const originalWindow = (globalThis as any).window;
        delete (globalThis as any).window;
        
        expect(() => browserService.updateUrl('/test')).not.toThrow();
        
        (globalThis as any).window = originalWindow;
      });
    });

    describe('replaceUrl', () => {
      it('should call history.replaceState with correct parameters', () => {
        const testPath = '/replace/path';
        
        browserService.replaceUrl(testPath);
        
        expect(mockReplaceState).toHaveBeenCalledWith(null, '', testPath);
      });

      it('should handle query parameters', () => {
        const pathWithQuery = '/path?param=value&other=123';
        
        browserService.replaceUrl(pathWithQuery);
        
        expect(mockReplaceState).toHaveBeenCalledWith(null, '', pathWithQuery);
      });

      it('should not crash when window is undefined', () => {
        const originalWindow = (globalThis as any).window;
        delete (globalThis as any).window;
        
        expect(() => browserService.replaceUrl('/test')).not.toThrow();
        
        (globalThis as any).window = originalWindow;
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing history API gracefully', () => {
      const originalHistory = window.history;
      delete (window as any).history;
      
      expect(() => browserService.updateUrl('/test')).not.toThrow();
      expect(() => browserService.replaceUrl('/test')).not.toThrow();
      
      (window as any).history = originalHistory;
    });
  });
}); 