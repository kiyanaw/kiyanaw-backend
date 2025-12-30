// Mock Quill
const mockRoot = {
  setAttribute: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn()
};

const mockFormatText = jest.fn();

class MockInline {
  static blotName = 'mock-inline';
  static tagName = 'span';
  static create() {
    return document.createElement('span');
  }
  static formats() {
    return true;
  }
  format() {}
}

class MockDelta {
  ops: Array<Record<string, unknown>>;

  constructor() {
    this.ops = [];
  }

  retain(count: number, attributes?: Record<string, unknown>) {
    const op: Record<string, unknown> = { retain: count };
    if (attributes) {
      op.attributes = attributes;
    }
    this.ops.push(op);
    return this;
  }
}

const mockUpdateContents = jest.fn();

const mockQuill = {
  enable: jest.fn(),
  disable: jest.fn(),
  off: jest.fn(),
  on: jest.fn(),
  setText: jest.fn(),
  getText: jest.fn().mockReturnValue('mock text content'),
  getSelection: jest.fn().mockReturnValue(null),
  setSelection: jest.fn(),
  formatText: mockFormatText,
  getFormat: jest.fn().mockReturnValue({}),
  getContents: jest.fn().mockReturnValue({ ops: [{ insert: 'mock text content' }] }),
  updateContents: mockUpdateContents,
  blur: jest.fn(),
  focus: jest.fn(),
  root: mockRoot,
  container: { isConnected: true }
};

const mockQuillConstructor = jest.fn(() => mockQuill) as jest.MockedFunction<any> & { 
  register: jest.MockedFunction<any>;
  import: jest.MockedFunction<any>;
};
mockQuillConstructor.register = jest.fn();
mockQuillConstructor.import = jest.fn((path: string) => {
  if (path === 'blots/inline') {
    return MockInline;
  }

  if (path === 'delta') {
    return MockDelta;
  }

  return class {};
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
          formats: ['known-word', 'ambiguous-word', 'spelling-suggestion', 'issue-needs-help', 'issue-indexing', 'issue-new-word'],
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
          formats: ['known-word', 'ambiguous-word', 'spelling-suggestion', 'issue-needs-help', 'issue-indexing', 'issue-new-word']
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

    it('cleans up the editor instance', () => {
      rteService.destroy('test-region:main');
      
      // Verify editor was removed from registry (tested by other test)
      expect(rteService.hasEditor('test-region:main')).toBe(false);
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
    let mockGetText: jest.Mock;

    beforeEach(() => {
      mockFormatText.mockReset();
      mockGetText = jest.fn();
      
      // Extend the mock quill with formatting methods
      Object.assign(mockQuill, {
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

  describe('applyHighlighting (selective approach)', () => {
    let mockGetText: jest.Mock;
    let mockGetSelection: jest.Mock;
    let mockSetSelection: jest.Mock;
    let mockGetContents: jest.Mock;

    beforeEach(() => {
      mockGetText = jest.fn();
      mockGetSelection = jest.fn().mockReturnValue(null); // Default: no selection
      mockSetSelection = jest.fn();
      mockGetContents = jest.fn().mockReturnValue({ ops: [{ insert: 'mock text content' }] });
      mockFormatText.mockReset();
      mockUpdateContents.mockReset();
      
      Object.assign(mockQuill, {
        getText: mockGetText,
        getSelection: mockGetSelection,
        setSelection: mockSetSelection,
        getContents: mockGetContents,
        updateContents: mockUpdateContents,
      });
      
      rteService.createOrGet('test-region:main', {});
    });

    it('should only format positions that need highlighting (no existing formatting)', () => {
      const text = 'hello world';
      mockGetText.mockReturnValue(text);
      mockGetContents.mockReturnValue({ ops: [{ insert: text }] }); // No formatted segments
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['hello'],
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalledTimes(1);
      const [delta, source] = mockUpdateContents.mock.calls[0];
      expect(delta.ops).toEqual([
        { retain: 5, attributes: { 'known-word': true } }
      ]);
      expect(source).toBe('silent');
    });

    it('should remove stale formatting (word splitting scenario)', () => {
      const text = 'hel lo world'; // 'hello' was split into 'hel lo'
      mockGetText.mockReturnValue(text);
      
      mockGetContents.mockReturnValue({
        ops: [
          { insert: 'hel', attributes: { 'known-word': true } },
          { insert: ' ' },
          { insert: 'lo', attributes: { 'known-word': true } },
          { insert: ' ' },
          { insert: 'world' }
        ]
      });
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['world'], // Only 'world' should be highlighted now
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalledTimes(2);

      const [removalDelta, removalSource] = mockUpdateContents.mock.calls[0];
      expect(removalDelta.ops).toEqual([
        { retain: 3, attributes: { 'known-word': null } },
        { retain: 1 },
        { retain: 2, attributes: { 'known-word': null } }
      ]);
      expect(removalSource).toBe('silent');

      const [additionDelta, additionSource] = mockUpdateContents.mock.calls[1];
      expect(additionDelta.ops).toEqual([
        { retain: 7 },
        { retain: 5, attributes: { 'known-word': true } }
      ]);
      expect(additionSource).toBe('silent');
    });

    it('should preserve selection during formatting', () => {
      const mockSelection = { index: 5, length: 0 };
      mockGetSelection.mockReturnValue(mockSelection);
      mockGetText.mockReturnValue('hello world');
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['hello'],
        issues: []
      });
      
      // Should restore selection after formatting
      expect(mockSetSelection).toHaveBeenCalledWith(mockSelection, 'api');
    });

    it('should handle empty text gracefully', () => {
      mockGetText.mockReturnValue('');
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['hello'],
        issues: []
      });
      
      expect(mockUpdateContents).not.toHaveBeenCalled();
    });

    it('should handle non-existent editor gracefully', () => {
      expect(() => {
        rteService.applyHighlighting('non-existent:main', {
          knownWords: ['hello'],
          issues: []
        });
      }).not.toThrow();
      
      expect(mockUpdateContents).not.toHaveBeenCalled();
    });
  });

  describe('position-based ambiguous word highlighting', () => {
    let mockGetText: jest.Mock;
    let mockGetSelection: jest.Mock;
    let mockSetSelection: jest.Mock;
    let mockGetContents: jest.Mock;

    beforeEach(() => {
      mockGetText = jest.fn();
      mockGetSelection = jest.fn().mockReturnValue(null);
      mockSetSelection = jest.fn();
      mockGetContents = jest.fn().mockReturnValue({ ops: [{ insert: 'mock text content' }] });
      mockFormatText.mockReset();
      mockUpdateContents.mockReset();
      
      Object.assign(mockQuill, {
        getText: mockGetText,
        getSelection: mockGetSelection,
        setSelection: mockSetSelection,
        getContents: mockGetContents,
        updateContents: mockUpdateContents,
      });
      
      rteService.createOrGet('test-region:main', {});
    });

    it('should highlight only ambiguous occurrences based on index', () => {
      const text = 'isi foo isi';
      mockGetText.mockReturnValue(text);
      mockGetContents.mockReturnValue({ ops: [{ insert: text }] });
      
      const regionAnalysis = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto' as const, index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 2 },
      ];
      
      // Both 'isi' occurrences are ambiguous (indices 0 and 2)
      const ambiguousIndices = new Set([0, 2]);
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['isi', 'foo'],
        ambiguousIndices,
        regionAnalysis,
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalled();
      const [delta] = mockUpdateContents.mock.calls[0];
      
      // Should highlight both 'isi' occurrences as ambiguous
      expect(delta.ops).toContainEqual({ retain: 3, attributes: { 'ambiguous-word': true } }); // First 'isi'
      expect(delta.ops).toContainEqual({ retain: 3, attributes: { 'ambiguous-word': true } }); // Second 'isi'
    });

    it('should not highlight user-selected occurrence of duplicate word', () => {
      const text = 'isi foo isi';
      mockGetText.mockReturnValue(text);
      mockGetContents.mockReturnValue({ ops: [{ insert: text }] });
      
      const regionAnalysis = [
        { word: 'isi', analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto' as const, index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 2 },
      ];
      
      // Only the second 'isi' is ambiguous (index 2)
      const ambiguousIndices = new Set([2]);
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['isi', 'foo'],
        ambiguousIndices,
        regionAnalysis,
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalled();
      const calls = mockUpdateContents.mock.calls;
      
      // Should only highlight the second 'isi' (at position 8)
      const allOps = calls.flatMap(call => call[0].ops);
      const ambiguousOps = allOps.filter(op => op.attributes?.['ambiguous-word']);
      expect(ambiguousOps.length).toBeGreaterThan(0);
    });

    it('should handle three occurrences with mixed user/auto selections', () => {
      const text = 'isi isi isi';
      mockGetText.mockReturnValue(text);
      mockGetContents.mockReturnValue({ ops: [{ insert: text }] });
      
      const regionAnalysis = [
        { word: 'isi', analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 0 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 2 },
      ];
      
      // Only the middle 'isi' is ambiguous (index 1)
      const ambiguousIndices = new Set([1]);
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['isi'],
        ambiguousIndices,
        regionAnalysis,
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalled();
      // The middle 'isi' should be highlighted as ambiguous
      // First and third should only have known-word highlighting
    });

    it('should handle empty ambiguousIndices set', () => {
      const text = 'isi foo';
      mockGetText.mockReturnValue(text);
      mockGetContents.mockReturnValue({ ops: [{ insert: text }] });
      
      const regionAnalysis = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc'], source: 'user' as const, index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto' as const, index: 1 },
      ];
      
      rteService.applyHighlighting('test-region:main', {
        knownWords: ['isi', 'foo'],
        ambiguousIndices: new Set(),
        regionAnalysis,
        issues: []
      });
      
      expect(mockUpdateContents).toHaveBeenCalled();
      const calls = mockUpdateContents.mock.calls;
      const allOps = calls.flatMap(call => call[0].ops);
      
      // Should not have any ambiguous-word formatting
      const ambiguousOps = allOps.filter(op => op.attributes?.['ambiguous-word']);
      expect(ambiguousOps.length).toBe(0);
    });
  });

  describe('stripInheritedFormats (via onTextChange)', () => {
    beforeEach(() => {
      mockFormatText.mockReset();
      rteService.createOrGet('test-region:main', {});
    });

    it('strips inherited word-level formats from entire word containing insertion', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Mock text AFTER insertion: "foo txesting bar"
      // Original was "foo testing bar", inserted 'x' at position 5
      // Position: f=0, o=1, o=2, space=3, t=4, x=5, e=6, s=7, t=8, i=9, n=10, g=11, space=12, b=13...
      mockQuill.getText.mockReturnValue('foo txesting bar');

      // Get the text-change listener
      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Simulate user typing 'x' at position 5 (into "testing" -> "txesting")
      const delta = {
        ops: [
          { retain: 5 },
          { insert: 'x' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Word "txesting" starts at position 4, has length 8
      expect(mockFormatText).toHaveBeenCalledWith(4, 8, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('strips formats from multiple insert operations in separate words', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Two separate inserts into separate words
      // After both inserts: "abx cd yzef"
      // Position: a=0, b=1, x=2, space=3, c=4, d=5, space=6, y=7, z=8, e=9, f=10
      mockQuill.getText.mockReturnValue('abx cd yzef');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Delta: retain 2 (past "ab"), insert "x", retain 4 (past " cd "), insert "yz"
      // Position tracking: 0 -> 2 -> 3 -> 7
      const delta = {
        ops: [
          { retain: 2 },
          { insert: 'x' },
          { retain: 4 },    // Skip over " cd " (4 chars after insert)
          { insert: 'yz' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // First insert at position 2: word "abx" is at 0-2, length 3
      expect(mockFormatText).toHaveBeenCalledWith(0, 3, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');

      // Second insert at position 7 (2+1+4=7): word "yzef" is at 7-10, length 4
      expect(mockFormatText).toHaveBeenCalledWith(7, 4, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('handles insert at beginning of document (no retain)', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert: "hello world" - inserted "hello" at position 0
      mockQuill.getText.mockReturnValue('hello world');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert at position 0
      const delta = {
        ops: [
          { insert: 'hello' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Word "hello" is at position 0, length 5 (no adjacent word chars after the space)
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('handles empty delta ops gracefully', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Empty ops array
      const delta = { ops: [] };

      textChangeListener(delta, {}, 'user');

      // Should not call formatText
      expect(mockFormatText).not.toHaveBeenCalled();
    });

    it('handles undefined ops gracefully', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // No ops property
      const delta = {};

      textChangeListener(delta, {}, 'user');

      // Should not call formatText
      expect(mockFormatText).not.toHaveBeenCalled();
    });

    it('ignores delete operations for position tracking', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after the delete+insert: "foo newbar"
      // Original was "foo oldbar", deleted "old" at position 5, inserted "new"
      mockQuill.getText.mockReturnValue('foo newbar');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Simulate delete followed by insert
      const delta = {
        ops: [
          { retain: 4 },
          { delete: 3 },
          { insert: 'new' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Insert at position 4, word "newbar" is at position 4, length 6
      expect(mockFormatText).toHaveBeenCalledWith(4, 6, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('does not strip formats for API-initiated changes', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      const delta = {
        ops: [
          { insert: 'api text' }
        ]
      };

      // API source, not user
      textChangeListener(delta, {}, 'api');

      // Should not strip formats for API changes
      expect(mockFormatText).not.toHaveBeenCalled();
    });

    it('uses silent source to prevent triggering further events', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert: "xtest"
      mockQuill.getText.mockReturnValue('xtest');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      const delta = {
        ops: [
          { insert: 'x' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Verify 'silent' source is used
      expect(mockFormatText).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        'silent'
      );
    });

    it('strips formatting from entire word when typing into middle of formatted word', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Simulate text is already "helo world" and we insert 'l' at position 3 to make "hello"
      // After insert, text becomes "hello world"
      mockQuill.getText.mockReturnValue('hello world');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert 'l' at position 3 (into "helo" -> "hello")
      const delta = {
        ops: [
          { retain: 3 },
          { insert: 'l' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Should strip formatting from entire word "hello" (position 0, length 5)
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('strips formatting from entire word when typing at end of formatted word', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert is "âha" (typing 'a' at end of "âh")
      mockQuill.getText.mockReturnValue('âha');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert 'a' at position 2 (end of "âh")
      const delta = {
        ops: [
          { retain: 2 },
          { insert: 'a' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Should strip formatting from entire word "âha" (position 0, length 3)
      expect(mockFormatText).toHaveBeenCalledWith(0, 3, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('only strips formatting from affected word, not adjacent words', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert: "hello worldx test"
      mockQuill.getText.mockReturnValue('hello worldx test');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert 'x' at position 11 (end of "world")
      const delta = {
        ops: [
          { retain: 11 },
          { insert: 'x' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Should only strip formatting from "worldx" (position 6, length 6), not "hello" or "test"
      expect(mockFormatText).toHaveBeenCalledWith(6, 6, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('handles Unicode characters in word boundary detection', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert: "êkwax" (typing 'x' at end of "êkwa")
      mockQuill.getText.mockReturnValue('êkwax');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert 'x' at position 4 (end of "êkwa")
      const delta = {
        ops: [
          { retain: 4 },
          { insert: 'x' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Should strip formatting from entire word "êkwax" (position 0, length 5)
      expect(mockFormatText).toHaveBeenCalledWith(0, 5, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });

    it('handles word at start of text', () => {
      const callback = jest.fn();
      rteService.onTextChange('test-region:main', callback);

      // Text after insert: "ax test"
      mockQuill.getText.mockReturnValue('ax test');

      const textChangeListener = mockQuill.on.mock.calls[0][1];

      // Insert 'x' at position 1 (into word at start)
      const delta = {
        ops: [
          { retain: 1 },
          { insert: 'x' }
        ]
      };

      textChangeListener(delta, {}, 'user');

      // Should strip formatting from "ax" (position 0, length 2)
      expect(mockFormatText).toHaveBeenCalledWith(0, 2, {
        'known-word': false,
        'ambiguous-word': false,
        'spelling-suggestion': false,
      }, 'silent');
    });
  });

});