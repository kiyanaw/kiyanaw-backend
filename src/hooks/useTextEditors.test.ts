import { renderHook, act } from '@testing-library/react';
import { useTextEditors } from './useTextEditors';
import { rteService } from '../services/rteService';

// Mock the rteService
jest.mock('../services/rteService', () => ({
  rteService: {
    createOrGet: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    destroy: jest.fn()
  }
}));

const mockRteService = rteService as jest.Mocked<typeof rteService>;

// Create custom renderHook function that properly mocks refs
const renderHookWithMockedRefs = (
  callback: () => ReturnType<typeof useTextEditors>,
  mainRef?: HTMLElement,
  translationRef?: HTMLElement
) => {
  return renderHook(() => {
    const hook = callback();
    
    // Mock refs after hook creation but before effects run
    if (mainRef) {
      Object.defineProperty(hook.mainEditorRef, 'current', {
        value: mainRef,
        writable: true
      });
    }
    
    if (translationRef) {
      Object.defineProperty(hook.translationEditorRef, 'current', {
        value: translationRef,
        writable: true
      });
    }
    
    return hook;
  });
};

describe('useTextEditors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns refs and editor keys', () => {
      const { result } = renderHook(() => useTextEditors('test-region', 'main'));

      expect(result.current.mainEditorRef).toBeDefined();
      expect(result.current.translationEditorRef).toBeDefined();
      expect(result.current.mainEditorKey).toBe('test-region:main');
      expect(result.current.translationEditorKey).toBe('test-region:translation');
    });
  });

  describe('main editor lifecycle', () => {
    it('creates and attaches main editor when activeTab is main and ref exists', () => {
      const mockDiv = document.createElement('div');
      
      renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'main'),
        mockDiv
      );

      expect(mockRteService.createOrGet).toHaveBeenCalledWith(
        'test-region:main',
        {
          readonly: false,
          placeholder: "Enter original text..."
        }
      );
      expect(mockRteService.attach).toHaveBeenCalledWith('test-region:main', mockDiv);
    });

    it('does not create editor when activeTab is not main', () => {
      const mockDiv = document.createElement('div');
      
      renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'translation'),
        mockDiv
      );

      expect(mockRteService.createOrGet).not.toHaveBeenCalledWith(
        'test-region:main',
        expect.any(Object)
      );
    });

    it('detaches main editor on cleanup', () => {
      const mockDiv = document.createElement('div');
      
      const { unmount } = renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'main'),
        mockDiv
      );

      unmount();

      expect(mockRteService.detach).toHaveBeenCalledWith('test-region:main');
    });
  });

  describe('translation editor lifecycle', () => {
    it('creates and attaches translation editor when activeTab is translation and ref exists', () => {
      const mockDiv = document.createElement('div');
      
      renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'translation'),
        undefined,
        mockDiv
      );

      expect(mockRteService.createOrGet).toHaveBeenCalledWith(
        'test-region:translation',
        {
          readonly: false,
          placeholder: "Enter translation..."
        }
      );
      expect(mockRteService.attach).toHaveBeenCalledWith('test-region:translation', mockDiv);
    });

    it('does not create editor when activeTab is not translation', () => {
      const mockDiv = document.createElement('div');
      
      renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'main'),
        undefined,
        mockDiv
      );

      expect(mockRteService.createOrGet).not.toHaveBeenCalledWith(
        'test-region:translation',
        expect.any(Object)
      );
    });

    it('detaches translation editor on cleanup', () => {
      const mockDiv = document.createElement('div');
      
      const { unmount } = renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'translation'),
        undefined,
        mockDiv
      );

      unmount();

      expect(mockRteService.detach).toHaveBeenCalledWith('test-region:translation');
    });
  });

  describe('tab switching', () => {
    it('switches from main to translation editor', () => {
      const mockMainDiv = document.createElement('div');
      const mockTranslationDiv = document.createElement('div');
      
      const { rerender } = renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'main'),
        mockMainDiv,
        mockTranslationDiv
      );

      // Should have attached main initially
      expect(mockRteService.attach).toHaveBeenCalledWith('test-region:main', mockMainDiv);

      // Switch to translation tab
      rerender();
      
      const { unmount } = renderHookWithMockedRefs(
        () => useTextEditors('test-region', 'translation'),
        mockMainDiv,
        mockTranslationDiv
      );

      // Should attach translation editor
      expect(mockRteService.attach).toHaveBeenCalledWith('test-region:translation', mockTranslationDiv);
    });
  });

  describe('region changes', () => {
    it('updates editor keys when regionId changes', () => {
      const { result, rerender } = renderHook(
        ({ regionId }) => useTextEditors(regionId, 'main'),
        { initialProps: { regionId: 'region-1' } }
      );

      expect(result.current.mainEditorKey).toBe('region-1:main');
      expect(result.current.translationEditorKey).toBe('region-1:translation');

      // Change region
      rerender({ regionId: 'region-2' });

      expect(result.current.mainEditorKey).toBe('region-2:main');
      expect(result.current.translationEditorKey).toBe('region-2:translation');
    });
  });

  describe('edge cases', () => {
    it('handles null refs gracefully', () => {
      renderHook(() => useTextEditors('test-region', 'main'));

      // Should not throw or call rteService methods when refs are null
      expect(mockRteService.createOrGet).not.toHaveBeenCalled();
      expect(mockRteService.attach).not.toHaveBeenCalled();
    });
  });
}); 