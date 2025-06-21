// Mock Quill
const mockRoot = {
  setAttribute: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn()
};

const mockQuill = {
  enable: jest.fn(),
  disable: jest.fn(),
  off: jest.fn(),
  on: jest.fn(),
  setText: jest.fn(),
  getText: jest.fn().mockReturnValue('mock text content'),
  root: mockRoot
};

const mockQuillConstructor = jest.fn(() => mockQuill) as jest.MockedFunction<any> & { 
  register: jest.MockedFunction<any>;
  import: jest.MockedFunction<any>;
};
mockQuillConstructor.register = jest.fn();
mockQuillConstructor.import = jest.fn(() => {
  // Mock the Inline blot class
  return class MockInline {
    static blotName = 'mock-inline';
    static tagName = 'span';
    static create() { return document.createElement('span'); }
    static formats() { return true; }
    format() {}
  };
});

// Mock react-quill
jest.mock('react-quill', () => ({
  Quill: mockQuillConstructor
}));

// Mock CSS imports
jest.mock('react-quill/dist/quill.snow.css', () => ({}));

// Mock quill-cursors
jest.mock('quill-cursors', () => ({}));

import { rteService } from './rteService';

describe('rteService', () => {
  let mockContainer: HTMLElement;
  let mockOffScreenParent: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clean up any existing editors
    rteService.destroyAll();
    
    // Mock DOM elements
    mockContainer = document.createElement('div');
    mockOffScreenParent = document.createElement('div');
    
    // Mock document.createElement to return our mock elements
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'div') {
        // Return different divs for container vs off-screen parent
        return createElementSpy.mock.calls.length === 1 
          ? mockOffScreenParent 
          : mockContainer;
      }
      return document.createElement(tagName);
    });
    
    // Mock document.body.appendChild
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockOffScreenParent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rteService.destroyAll();
  });

  describe('createOrGet', () => {
    it('creates a new editor instance', () => {
      const config = { readonly: false, placeholder: 'Test' };
      const quill = rteService.createOrGet('test-region:main', config);

      expect(mockQuillConstructor).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          theme: 'snow',
          modules: expect.objectContaining({
            toolbar: false,
            cursors: expect.any(Object)
          }),
          formats: ['bold', 'italic', 'underline', 'color', 'background', 'known-word'],
          readonly: false,
          placeholder: 'Test'
        })
      );
      expect(quill).toBe(mockQuill);
    });

    it('returns existing editor instance for same key', () => {
      const config = { readonly: false };
      
      const quill1 = rteService.createOrGet('test-region:main', config);
      const quill2 = rteService.createOrGet('test-region:main', config);

      expect(mockQuillConstructor).toHaveBeenCalledTimes(1);
      expect(quill1).toBe(quill2);
      expect(quill1).toBe(mockQuill);
    });

    it('creates different configs for main vs translation editors', () => {
      rteService.createOrGet('test-region:main', {});
      rteService.createOrGet('test-region:translation', {});

      expect(mockQuillConstructor).toHaveBeenCalledTimes(2);
      
      // Main editor should have rich text formats
      expect(mockQuillConstructor).toHaveBeenNthCalledWith(1, 
        expect.any(HTMLElement),
        expect.objectContaining({
          formats: ['bold', 'italic', 'underline', 'color', 'background', 'known-word']
        })
      );
      
      // Translation editor should have no formats (plain text)
      expect(mockQuillConstructor).toHaveBeenNthCalledWith(2,
        expect.any(HTMLElement), 
        expect.objectContaining({
          formats: []
        })
      );
    });

    it('merges provided config with defaults', () => {
      const config = { readonly: true, placeholder: 'Custom placeholder' };
      rteService.createOrGet('test-region:main', config);

      expect(mockQuillConstructor).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          readonly: true,
          placeholder: 'Custom placeholder'
        })
      );
    });
  });

  describe('attach', () => {
    let hostElement: HTMLElement;

    beforeEach(() => {
      hostElement = document.createElement('div');
    });

    it('attaches editor to host element', () => {
      rteService.createOrGet('test-region:main', {});
      const appendChildSpy = jest.spyOn(hostElement, 'appendChild');
      
      rteService.attach('test-region:main', hostElement);

      expect(appendChildSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    it('enables editor when not readonly', () => {
      rteService.createOrGet('test-region-enable:main', { readonly: false });
      
      rteService.attach('test-region-enable:main', hostElement);

      expect(mockQuill.enable).toHaveBeenCalled();
      expect(mockQuill.disable).not.toHaveBeenCalled();
    });

    it('disables editor when readonly', () => {
      rteService.createOrGet('test-region-readonly:main', { readonly: true });
      
      rteService.attach('test-region-readonly:main', hostElement);

      expect(mockQuill.disable).toHaveBeenCalled();
      expect(mockQuill.enable).not.toHaveBeenCalled();
    });

    it('throws error for non-existent editor', () => {
      expect(() => {
        rteService.attach('non-existent:main', hostElement);
      }).toThrow('RTE instance not found for key: non-existent:main');
    });
  });

  describe('detach', () => {
    beforeEach(() => {
      rteService.createOrGet('test-region:main', {});
    });

    it('detaches editor without error', () => {
      const hostElement = document.createElement('div');
      
      // First attach the editor to a host element
      rteService.attach('test-region:main', hostElement);
      
      // Then detach it - should not throw
      expect(() => {
        rteService.detach('test-region:main');
      }).not.toThrow();
    });

    it('handles detach for non-existent editor gracefully', () => {
      expect(() => {
        rteService.detach('non-existent:main');
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      rteService.createOrGet('test-region:main', {});
    });

    it('removes editor from registry', () => {
      expect(rteService.hasEditor('test-region:main')).toBe(true);
      
      rteService.destroy('test-region:main');
      
      expect(rteService.hasEditor('test-region:main')).toBe(false);
    });

    it('calls quill.off() if available', () => {
      rteService.destroy('test-region:main');
      
      expect(mockQuill.off).toHaveBeenCalled();
    });

    it('handles destroy for non-existent editor gracefully', () => {
      expect(() => {
        rteService.destroy('non-existent:main');
      }).not.toThrow();
    });
  });

  describe('getInstance', () => {
    it('returns quill instance for existing editor', () => {
      rteService.createOrGet('test-region:main', {});
      
      const instance = rteService.getInstance('test-region:main');
      
      expect(instance).toBe(mockQuill);
    });

    it('returns null for non-existent editor', () => {
      const instance = rteService.getInstance('non-existent:main');
      
      expect(instance).toBeNull();
    });
  });

  describe('hasEditor', () => {
    it('returns true for existing editor', () => {
      rteService.createOrGet('test-region:main', {});
      
      expect(rteService.hasEditor('test-region:main')).toBe(true);
    });

    it('returns false for non-existent editor', () => {
      expect(rteService.hasEditor('non-existent:main')).toBe(false);
    });
  });

  describe('destroyAll', () => {
    it('destroys all editors', () => {
      rteService.createOrGet('region1:main', {});
      rteService.createOrGet('region2:translation', {});
      
      expect(rteService.hasEditor('region1:main')).toBe(true);
      expect(rteService.hasEditor('region2:translation')).toBe(true);
      
      rteService.destroyAll();
      
      expect(rteService.hasEditor('region1:main')).toBe(false);
      expect(rteService.hasEditor('region2:translation')).toBe(false);
    });
  });

  describe('setContent', () => {
    beforeEach(() => {
      rteService.createOrGet('test-region:main', {});
    });

    it('sets content using setText with api source', () => {
      const content = 'Test content';
      
      rteService.setContent('test-region:main', content);
      
      expect(mockQuill.setText).toHaveBeenCalledWith('Test content', 'api');
    });

    it('handles empty content', () => {
      rteService.setContent('test-region:main', '');
      
      expect(mockQuill.setText).toHaveBeenCalledWith('', 'api');
    });

    it('handles null content', () => {
      rteService.setContent('test-region:main', null as any);
      
      expect(mockQuill.setText).toHaveBeenCalledWith('', 'api');
    });

    it('handles undefined content', () => {
      rteService.setContent('test-region:main', undefined as any);
      
      expect(mockQuill.setText).toHaveBeenCalledWith('', 'api');
    });

    it('throws error for non-existent editor', () => {
      expect(() => {
        rteService.setContent('non-existent:main', 'content');
      }).toThrow('RTE instance not found for key: non-existent:main');
    });
  });

  describe('onTextChange', () => {
    beforeEach(() => {
      rteService.createOrGet('test-region:main', {});
    });

    it('sets up text change listener', () => {
      const callback = jest.fn();
      
      rteService.onTextChange('test-region:main', callback);
      
      expect(mockQuill.on).toHaveBeenCalledWith('text-change', expect.any(Function));
    });

    it('calls callback only for user-initiated changes', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);
      
      // Get the listener function that was passed to quill.on
      const textChangeListener = mockQuill.on.mock.calls[0][1];
      
      // Simulate user change
      textChangeListener({}, {}, 'user');
      expect(callback).toHaveBeenCalledWith('mock text content');
      
      // Reset mock
      callback.mockClear();
      
      // Simulate API change
      textChangeListener({}, {}, 'api');
      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores API changes to prevent race conditions', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);
      
      const textChangeListener = mockQuill.on.mock.calls[0][1];
      
      // Test various non-user sources
      textChangeListener({}, {}, 'api');
      textChangeListener({}, {}, 'silent');
      textChangeListener({}, {}, undefined);
      textChangeListener({}, {}, null);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('trims text content before calling callback', () => {
      mockQuill.getText.mockReturnValue('  trimmed text  ');
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);
      
      const textChangeListener = mockQuill.on.mock.calls[0][1];
      textChangeListener({}, {}, 'user');
      
      expect(callback).toHaveBeenCalledWith('trimmed text');
    });

    it('throws error for non-existent editor', () => {
      const callback = jest.fn();
      
      expect(() => {
        rteService.onTextChange('non-existent:main', callback);
      }).toThrow('RTE instance not found for key: non-existent:main');
    });
  });

  describe('offTextChange', () => {
    beforeEach(() => {
      rteService.createOrGet('test-region:main', {});
    });

    it('removes text change listener', () => {
      rteService.offTextChange('test-region:main');
      
      expect(mockQuill.off).toHaveBeenCalledWith('text-change');
    });

    it('handles removal for non-existent editor gracefully', () => {
      expect(() => {
        rteService.offTextChange('non-existent:main');
      }).not.toThrow();
    });

    it('clears callback reference', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);
      
      // The callback should be stored (we can't directly test this, but we can test the behavior)
      rteService.offTextChange('test-region:main');
      
      // After removing, the callback should be cleared
      expect(mockQuill.off).toHaveBeenCalledWith('text-change');
    });
  });

  describe('text change integration (race condition prevention)', () => {
    it('prevents saves during content initialization', () => {
      const callback = jest.fn();
      
      // Create editor and set up listener
      rteService.createOrGet('test-region:main', {});
      rteService.onTextChange('test-region:main', callback);
      
      // Set content (simulates initialization)
      rteService.setContent('test-region:main', 'Initial content');
      
      // Get the text change listener
      const textChangeListener = mockQuill.on.mock.calls[0][1];
      
      // Simulate what happens when setText is called with 'api' source
      textChangeListener({}, {}, 'api');
      
      // Callback should NOT be called (preventing unwanted save)
      expect(callback).not.toHaveBeenCalled();
    });

    it('allows saves during user typing', () => {
      // Reset mock to default value for this test
      mockQuill.getText.mockReturnValue('mock text content');
      
      const callback = jest.fn();
      
      // Create editor and set up listener  
      rteService.createOrGet('test-region:main', {});
      rteService.onTextChange('test-region:main', callback);
      
      // Get the text change listener
      const textChangeListener = mockQuill.on.mock.calls[0][1];
      
      // Simulate user typing
      textChangeListener({}, {}, 'user');
      
      // Callback SHOULD be called (allowing legitimate save)
      expect(callback).toHaveBeenCalledWith('mock text content');
    });
  });

  describe('applyKnownWordsFormatting', () => {
    let mockFormatText: jest.Mock;
    let mockGetText: jest.Mock;

    beforeEach(() => {
      mockFormatText = jest.fn();
      mockGetText = jest.fn();
      
      // Extend the mock quill with formatting methods
      Object.assign(mockQuill, {
        formatText: mockFormatText,
        getText: mockGetText
      });
      
      rteService.createOrGet('test-region:main', {});
    });

    it('applies formatting to known words in text', () => {
      mockGetText.mockReturnValue('hello world êkwa test');
      const knownWords = ['hello', 'êkwa'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 21, 'known-word', false, 'api');
      // Should format 'hello' at position 0, length 5
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
      // Should format 'êkwa' at position 12, length 4  
      expect(mockFormatText).toHaveBeenCalledWith(12, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });

    it('handles empty known words array', () => {
      mockGetText.mockReturnValue('hello world');
      
      rteService.applyKnownWordsFormatting('test-region:main', []);
      
      expect(mockFormatText).not.toHaveBeenCalled();
    });

    it('handles empty text', () => {
      mockGetText.mockReturnValue('');
      const knownWords = ['hello', 'world'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      expect(mockFormatText).not.toHaveBeenCalled();
    });

    it('handles text with no matching known words', () => {
      mockGetText.mockReturnValue('unknown words only');
      const knownWords = ['hello', 'world'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should still clear existing formatting even if no matches found
      expect(mockFormatText).toHaveBeenCalledWith(0, 18, 'known-word', false, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(1);
    });

    it('handles Unicode characters correctly', () => {
      mockGetText.mockReturnValue('itwêw êkwa tâpwê');
      const knownWords = ['itwêw', 'tâpwê'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 16, 'known-word', false, 'api');
      // Should format 'itwêw' at position 0, length 5
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
      // Should format 'tâpwê' at position 11, length 5
      expect(mockFormatText).toHaveBeenCalledWith(11, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });

    it('handles multiple occurrences of same word', () => {
      mockGetText.mockReturnValue('hello test hello world');
      const knownWords = ['hello'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 22, 'known-word', false, 'api');
      // Should format both occurrences of 'hello'
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(11, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });

    it('handles overlapping word boundaries correctly', () => {
      mockGetText.mockReturnValue('testing test tests');
      const knownWords = ['test'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 18, 'known-word', false, 'api');
      // Should only format the standalone 'test', not parts of 'testing' or 'tests'
      expect(mockFormatText).toHaveBeenCalledWith(8, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(2);
    });

    it('handles punctuation correctly', () => {
      mockGetText.mockReturnValue('Hello, world! How are you?');
      const knownWords = ['hello', 'world'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 26, 'known-word', false, 'api');
      // Should format 'Hello' and 'world' despite punctuation
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(7, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });

    it('sorts words by length (longest first) to prevent partial matches', () => {
      mockGetText.mockReturnValue('test testing');
      const knownWords = ['test', 'testing']; // shorter word first
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 12, 'known-word', false, 'api');
      // Should format both 'test' and 'testing' as separate words
      expect(mockFormatText).toHaveBeenCalledWith(0, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(5, 7, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });

    it('uses api source to prevent triggering save events', () => {
      mockGetText.mockReturnValue('hello world');
      const knownWords = ['hello'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // All formatText calls should use 'api' source
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
    });

    it('handles non-existent editor gracefully', () => {
      const knownWords = ['hello'];
      
      // Should not throw - just return early
      expect(() => {
        rteService.applyKnownWordsFormatting('non-existent:main', knownWords);
      }).not.toThrow();
    });

    it('handles case insensitive matching', () => {
      mockGetText.mockReturnValue('Hello WORLD êKWA');
      const knownWords = ['hello', 'world', 'êkwa']; // lowercase in known words
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 16, 'known-word', false, 'api');
      // Should format all words regardless of case
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(6, 5, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(12, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(4);
    });

    it('handles special regex characters in words', () => {
      mockGetText.mockReturnValue('test (word) with.punctuation');
      const knownWords = ['test', 'word'];
      
      rteService.applyKnownWordsFormatting('test-region:main', knownWords);
      
      // Should first clear existing formatting
      expect(mockFormatText).toHaveBeenCalledWith(0, 28, 'known-word', false, 'api');
      // Should properly escape special characters and match
      expect(mockFormatText).toHaveBeenCalledWith(0, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledWith(6, 4, 'known-word', true, 'api');
      expect(mockFormatText).toHaveBeenCalledTimes(3);
    });
  });
}); 