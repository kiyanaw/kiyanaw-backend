import { MOBILE_BREAKPOINT, isMobileViewport } from './ui';

describe('UI Config', () => {
  describe('MOBILE_BREAKPOINT', () => {
    it('should be defined as 1024', () => {
      expect(MOBILE_BREAKPOINT).toBe(1024);
    });
  });

  describe('isMobileViewport', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      // Restore original innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it('should return true when window width is less than MOBILE_BREAKPOINT', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1023,
      });
      expect(isMobileViewport()).toBe(true);
    });

    it('should return false when window width equals MOBILE_BREAKPOINT', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      expect(isMobileViewport()).toBe(false);
    });

    it('should return false when window width is greater than MOBILE_BREAKPOINT', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      expect(isMobileViewport()).toBe(false);
    });

    it('should handle edge case at breakpoint - 1', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: MOBILE_BREAKPOINT - 1,
      });
      expect(isMobileViewport()).toBe(true);
    });

    it('should handle edge case at breakpoint + 1', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: MOBILE_BREAKPOINT + 1,
      });
      expect(isMobileViewport()).toBe(false);
    });
  });
});

