/**
 * Focus preservation test for useTextEditors
 * 
 * This test ensures that typing in the editor doesn't cause focus loss
 * due to effect re-runs triggered by store updates.
 */

import { renderHook } from '@testing-library/react';
import { useTextEditors } from './useTextEditors';
import { rteService } from '../services/rteService';
import { useEditorStore } from '../stores/useEditorStore';

// Mock the dependencies
jest.mock('../services/rteService', () => ({
  rteService: {
    createOrGet: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    destroy: jest.fn(),
    onTextChange: jest.fn(),
    offTextChange: jest.fn(),
    setContent: jest.fn(),
    getInstance: jest.fn(),
    hasEditor: jest.fn().mockReturnValue(true),
    applyKnownWordsFormatting: jest.fn(),
    updateIssueHighlighting: jest.fn(),
    onSelectionChange: jest.fn(),
    offSelectionChange: jest.fn(),
    getSelectedText: jest.fn().mockReturnValue(''),
    getSelectionRange: jest.fn().mockReturnValue(null)
  }
}));
jest.mock('../stores/useEditorStore');
jest.mock('../services', () => ({
  services: {
    authService: {
      currentUser: () => ({ username: 'test-user' })
    },
    regionService: {
      updateRegion: jest.fn()
    }
  }
}));

const mockRteService = rteService as jest.Mocked<typeof rteService>;
const mockUseEditorStore = useEditorStore as unknown as jest.MockedFunction<typeof useEditorStore>;

describe('useTextEditors - Focus Preservation', () => {
  const regionId = 'test-region-id';
  const mockQuillInstance = {
    getText: jest.fn().mockReturnValue(''),
    setText: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock RTE service methods
    mockRteService.createOrGet.mockReturnValue(mockQuillInstance as any);
    mockRteService.getInstance.mockReturnValue(mockQuillInstance as any);
    mockRteService.attach.mockImplementation(() => {});
    mockRteService.detach.mockImplementation(() => {});
    mockRteService.setContent.mockImplementation(() => {});
    mockRteService.onTextChange.mockImplementation(() => {});
    mockRteService.offTextChange.mockImplementation(() => {});
    mockRteService.applyKnownWordsFormatting.mockImplementation(() => {});
  });

  it('should not detach and reattach editor when region text changes', () => {
    // Create mock DOM elements
    const mainEditorDiv = document.createElement('div');
    
    // Mock the store to return different region text on subsequent calls
    let textChangeCount = 0;
    mockUseEditorStore.mockImplementation((selector: any) => {
      const regionText = textChangeCount === 0 ? 'a' : textChangeCount === 1 ? 'ab' : 'abc';
      
      // Minimal mock that matches what useTextEditors actually uses
      const mockState = {
        regionById: () => ({
          regionText,
          translation: ''
        }),
        canEdit: true
      };
      textChangeCount++;
      
      return selector(mockState);
    });
    
    // Initial render
    const { result, rerender } = renderHook(
      () => useTextEditors(regionId, 'main'),
      {}
    );

    // Set up refs to simulate mounted component
    Object.defineProperty(result.current.mainEditorRef, 'current', {
      value: mainEditorDiv,
      writable: true
    });

    // Force initial render to set up editor
    rerender();

    // Clear counters after initial setup
    mockRteService.detach.mockClear();
    mockRteService.attach.mockClear();

    // Simulate typing (multiple re-renders that would previously cause focus loss)
    rerender(); // text changes from 'a' to 'ab'
    rerender(); // text changes from 'ab' to 'abc'
    rerender(); // additional render

    // The key assertion: detach should NOT be called when text changes
    // because we removed currentRegion?.regionText from dependencies
    expect(mockRteService.detach).not.toHaveBeenCalled();
    
    // attach should also not be called after initial setup
    expect(mockRteService.attach).not.toHaveBeenCalled();
  });

  it('should preserve focus by excluding region text from effect dependencies', () => {
    // This test ensures that the ESLint disable comment is in place
    // and the dependencies are correctly configured to prevent focus loss
    
    const fileContent = require('fs').readFileSync(
      require('path').join(__dirname, 'useTextEditors.ts'), 
      'utf8'
    );
    
    // Verify that ESLint disable comments are present
    expect(fileContent).toContain('// eslint-disable-next-line react-hooks/exhaustive-deps');
    
    // Verify that the dependencies explicitly exclude currentRegion
    expect(fileContent).toContain('// Deliberately excluding currentRegion to prevent focus loss');
    
    // Verify the actual dependency arrays don't include currentRegion
    const mainEditorDependencies = fileContent.match(/}, \[([^\]]+)\]\); \/\/ Deliberately excluding currentRegion/);
    const translationEditorDependencies = fileContent.match(/}, \[([^\]]+)\]\); \/\/ Deliberately excluding currentRegion/);
    
    expect(mainEditorDependencies).toBeTruthy();
    expect(translationEditorDependencies).toBeTruthy();
    
    // Ensure currentRegion is not in the dependencies
    expect(mainEditorDependencies![1]).not.toContain('currentRegion');
    expect(translationEditorDependencies![1]).not.toContain('currentRegion');
  });
}); 