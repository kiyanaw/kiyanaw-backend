// Mock Quill
const mockQuill = {
  enable: jest.fn(),
  disable: jest.fn(),
  off: jest.fn()
};

const mockQuillConstructor = jest.fn(() => mockQuill) as jest.MockedFunction<any> & { register: jest.MockedFunction<any> };
mockQuillConstructor.register = jest.fn();

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
          formats: ['bold', 'italic', 'underline', 'color', 'background'],
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
          formats: ['bold', 'italic', 'underline', 'color', 'background']
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
}); 