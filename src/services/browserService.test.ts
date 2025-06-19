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

  describe('Custom Styling', () => {
    // Mock DOM elements and CSSStyleSheet
    let mockStylesheet: any;
    let mockStyleElement: any;
    let mockHead: any;

    beforeEach(() => {
      // Clean up any existing stylesheet
      const existingStylesheet = document.getElementById('dynamic-styles');
      if (existingStylesheet) {
        existingStylesheet.remove();
      }

      // Reset the service's internal state by calling clearAllCustomStyles
      browserService.clearAllCustomStyles();

      // Create mocks
      mockStylesheet = {
        cssRules: { length: 0 },
        insertRule: jest.fn((rule, index) => {
          mockStylesheet.cssRules.length++;
          return index;
        }),
        deleteRule: jest.fn((index) => {
          mockStylesheet.cssRules.length--;
        })
      };

      mockStyleElement = {
        id: '',
        sheet: mockStylesheet
      };

      mockHead = {
        appendChild: jest.fn()
      };

      // Mock DOM methods
      jest.spyOn(document, 'createElement').mockReturnValue(mockStyleElement as any);
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'dynamic-styles') {
          return mockStyleElement as any;
        }
        return null;
      });
      Object.defineProperty(document, 'head', {
        value: mockHead,
        writable: true,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('addCustomStyle', () => {
      it('should create a dynamic stylesheet if it does not exist', () => {
        jest.spyOn(document, 'getElementById').mockReturnValue(null);

        const styleId = browserService.addCustomStyle('div#test', { 'background-color': 'red' });

        expect(document.createElement).toHaveBeenCalledWith('style');
        expect(mockStyleElement.id).toBe('dynamic-styles');
        expect(mockHead.appendChild).toHaveBeenCalledWith(mockStyleElement);
        expect(styleId).toBe('style-1');
      });

      it('should use existing stylesheet if it already exists', () => {
        const styleId = browserService.addCustomStyle('div#test', { 'background-color': 'red' });

        expect(document.createElement).not.toHaveBeenCalled();
        expect(mockHead.appendChild).not.toHaveBeenCalled();
        expect(styleId).toBe('style-1');
      });

      it('should insert CSS rule with correct selector and styles', () => {
        const selector = 'div#test-element';
        const styles = { 'background-color': 'blue', 'color': 'white' };

        browserService.addCustomStyle(selector, styles);

        expect(mockStylesheet.insertRule).toHaveBeenCalledWith(
          'div#test-element { background-color: blue; color: white; }',
          0
        );
      });

      it('should return unique style IDs for each call', () => {
        const styleId1 = browserService.addCustomStyle('div#test1', { 'background-color': 'red' });
        const styleId2 = browserService.addCustomStyle('div#test2', { 'background-color': 'blue' });
        const styleId3 = browserService.addCustomStyle('div#test3', { 'background-color': 'green' });

        expect(styleId1).toBe('style-1');
        expect(styleId2).toBe('style-2');
        expect(styleId3).toBe('style-3');
      });

      it('should handle styles with hyphens and special characters', () => {
        const styles = { 
          'background-color': 'rgba(255, 0, 0, 0.5)',
          'border-radius': '10px',
          'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
        };

        browserService.addCustomStyle('.test-class', styles);

        expect(mockStylesheet.insertRule).toHaveBeenCalledWith(
          '.test-class { background-color: rgba(255, 0, 0, 0.5); border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }',
          0
        );
      });

      it('should handle edge cases gracefully', () => {
        // Test with empty selector
        const styleId1 = browserService.addCustomStyle('', { 'background-color': 'red' });
        expect(styleId1).toBe('style-1'); // Should still work, just with empty selector

        // Test with empty styles
        const styleId2 = browserService.addCustomStyle('div#test', {});
        expect(styleId2).toBe('style-2'); // Should still work, just with empty styles

        // Test with null-like selector
        const styleId3 = browserService.addCustomStyle('div#valid', { 'color': 'blue' });
        expect(styleId3).toBe('style-3'); // Should work normally
      });
    });

    describe('removeCustomStyle', () => {
      it('should remove the correct CSS rule by selector', () => {
        // Add a style first
        const styleId = browserService.addCustomStyle('div#test-remove', { 'background-color': 'red' });

        // Mock the CSS rules with the selector we expect
        const mockRule = { selectorText: 'div#test-remove' };
        mockStylesheet.cssRules = [mockRule];
        mockStylesheet.cssRules.length = 1;

        browserService.removeCustomStyle(styleId);

        expect(mockStylesheet.deleteRule).toHaveBeenCalledWith(0);
      });

      it('should handle non-existent style IDs gracefully', () => {
        browserService.removeCustomStyle('non-existent-id');

        expect(mockStylesheet.deleteRule).not.toHaveBeenCalled();
      });

      it('should not crash when stylesheet does not exist', () => {
        jest.spyOn(document, 'getElementById').mockReturnValue(null);

        expect(() => browserService.removeCustomStyle('style-1')).not.toThrow();
      });

      it('should not crash when window is undefined', () => {
        const originalWindow = (globalThis as any).window;
        delete (globalThis as any).window;

        expect(() => browserService.removeCustomStyle('style-1')).not.toThrow();

        (globalThis as any).window = originalWindow;
      });

      it('should only remove the first matching rule', () => {
        // Add a style first to get a styleId
        const styleId = browserService.addCustomStyle('div#duplicate', { 'background-color': 'red' });

        // Mock multiple rules with same selector
        const mockRule1 = { selectorText: 'div#duplicate' };
        const mockRule2 = { selectorText: 'div#duplicate' };
        const mockRule3 = { selectorText: 'div#other' };
        mockStylesheet.cssRules = [mockRule1, mockRule2, mockRule3];
        mockStylesheet.cssRules.length = 3;

        browserService.removeCustomStyle(styleId);

        // Should only be called once (for the first matching rule from the end)
        expect(mockStylesheet.deleteRule).toHaveBeenCalledTimes(1);
        expect(mockStylesheet.deleteRule).toHaveBeenCalledWith(1); // Index 1 is the first duplicate when searching backwards
      });
    });

    describe('clearAllCustomStyles', () => {
      it('should remove all CSS rules from the stylesheet', () => {
        // Mock stylesheet with multiple rules
        mockStylesheet.cssRules.length = 3;
        mockStylesheet.deleteRule.mockImplementation(() => {
          mockStylesheet.cssRules.length--;
        });

        browserService.clearAllCustomStyles();

        expect(mockStylesheet.deleteRule).toHaveBeenCalledTimes(3);
        expect(mockStylesheet.deleteRule).toHaveBeenNthCalledWith(1, 0);
        expect(mockStylesheet.deleteRule).toHaveBeenNthCalledWith(2, 0);
        expect(mockStylesheet.deleteRule).toHaveBeenNthCalledWith(3, 0);
      });

      it('should reset internal counters', () => {
        // Add some styles first
        browserService.addCustomStyle('div#test1', { 'background-color': 'red' });
        browserService.addCustomStyle('div#test2', { 'background-color': 'blue' });

        // Clear all styles
        browserService.clearAllCustomStyles();

        // Next style should start from style-1 again
        const newStyleId = browserService.addCustomStyle('div#test3', { 'background-color': 'green' });
        expect(newStyleId).toBe('style-1');
      });

      it('should not crash when stylesheet does not exist', () => {
        jest.spyOn(document, 'getElementById').mockReturnValue(null);

        expect(() => browserService.clearAllCustomStyles()).not.toThrow();
      });

      it('should not crash when window is undefined', () => {
        const originalWindow = (globalThis as any).window;
        delete (globalThis as any).window;

        expect(() => browserService.clearAllCustomStyles()).not.toThrow();

        (globalThis as any).window = originalWindow;
      });
    });

    describe('Integration Tests', () => {
      it('should handle complete add/remove cycle correctly', () => {
        // Add multiple styles
        const styleId1 = browserService.addCustomStyle('div#test1', { 'background-color': 'red' });
        const styleId2 = browserService.addCustomStyle('div#test2', { 'background-color': 'blue' });
        const styleId3 = browserService.addCustomStyle('div#test3', { 'background-color': 'green' });

        expect(styleId1).toBe('style-1');
        expect(styleId2).toBe('style-2');
        expect(styleId3).toBe('style-3');

        // Mock the CSS rules
        mockStylesheet.cssRules = [
          { selectorText: 'div#test1' },
          { selectorText: 'div#test2' },
          { selectorText: 'div#test3' }
        ];
        mockStylesheet.cssRules.length = 3;

        // Remove middle style
        browserService.removeCustomStyle(styleId2);

        expect(mockStylesheet.deleteRule).toHaveBeenCalledWith(1);

        // Add another style - should get style-4 (counter continues)
        const styleId4 = browserService.addCustomStyle('div#test4', { 'background-color': 'yellow' });
        expect(styleId4).toBe('style-4');
      });
    });
  });
}); 