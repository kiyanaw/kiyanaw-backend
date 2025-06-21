import { render, screen, fireEvent } from '@testing-library/react';
import { RegionItem } from './RegionItem';
import { useEditorStore } from '../../stores/useEditorStore';
import { textHighlightService } from '../../services/textHighlightService';

// Mock the store
jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: jest.fn(),
}));

// Mock the text highlight service
jest.mock('../../services/textHighlightService', () => ({
  textHighlightService: {
    generateHTML: jest.fn(),
  },
}));

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockTextHighlightService = textHighlightService as jest.Mocked<typeof textHighlightService>;

describe('RegionItem', () => {
  const mockRegion = {
    id: 'test-region-1',
    start: 10.5,
    end: 25.8,
    regionText: 'Test region text with some words',
    translation: 'Test translation',
    isNote: false,
  };

  const mockKnownWords = new Set(['Test', 'words']);
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the store selectors
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? mockRegion : null),
        knownWords: mockKnownWords,
      } as any;
      
      return selector(mockState);
    });

    // Mock getState for the textHighlightService call
    mockUseEditorStore.getState = jest.fn().mockReturnValue({
      knownWords: mockKnownWords,
    });

    // Mock text highlight service
    mockTextHighlightService.generateHTML.mockReturnValue('<span class="known-word">Test</span> region text with some <span class="known-word">words</span>');
  });

  it('should render region with correct time formatting', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('0:10')).toBeInTheDocument();
    expect(screen.getByText('0:25')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // index + 1
  });

  it('should render region text with known words highlighting', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    expect(mockTextHighlightService.generateHTML).toHaveBeenCalledWith(
      'Test region text with some words',
      mockKnownWords
    );
  });

  it('should re-render when knownWords change', () => {
    const { rerender } = render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Initial call
    expect(mockTextHighlightService.generateHTML).toHaveBeenCalledTimes(1);

    // Update known words in store
    const updatedKnownWords = new Set(['Test', 'words', 'region']);
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? mockRegion : null),
        knownWords: updatedKnownWords,
      } as any;
      
      return selector(mockState);
    });

    // Re-render component
    rerender(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Should call generateHTML again with updated known words
    expect(mockTextHighlightService.generateHTML).toHaveBeenCalledTimes(2);
    expect(mockTextHighlightService.generateHTML).toHaveBeenLastCalledWith(
      'Test region text with some words',
      updatedKnownWords
    );
  });

  it('should re-render when region text changes', () => {
    const { rerender } = render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Initial call
    expect(mockTextHighlightService.generateHTML).toHaveBeenCalledTimes(1);

    // Update region text
    const updatedRegion = {
      ...mockRegion,
      regionText: 'Updated region text',
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? updatedRegion : null),
        knownWords: mockKnownWords,
      } as any;
      
      return selector(mockState);
    });

    // Re-render component
    rerender(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Should call generateHTML again with updated text
    expect(mockTextHighlightService.generateHTML).toHaveBeenCalledTimes(2);
    expect(mockTextHighlightService.generateHTML).toHaveBeenLastCalledWith(
      'Updated region text',
      mockKnownWords
    );
  });

  it('should handle note regions correctly', () => {
    const noteRegion = {
      ...mockRegion,
      isNote: true,
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? noteRegion : null),
        knownWords: mockKnownWords,
      } as any;
      
      return selector(mockState);
    });

    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Note regions should not show the main text content area
    expect(screen.queryByText('0:10')).not.toBeInTheDocument();
    expect(screen.queryByText('0:25')).not.toBeInTheDocument();
    
    // But should show translation with note styling
    expect(screen.getByText('Test translation')).toBeInTheDocument();
  });

  it('should handle empty region text', () => {
    const emptyRegion = {
      ...mockRegion,
      regionText: '',
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? emptyRegion : null),
        knownWords: mockKnownWords,
      } as any;
      
      return selector(mockState);
    });

    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Should not call generateHTML for empty text
    expect(mockTextHighlightService.generateHTML).not.toHaveBeenCalled();
  });

  it('should call onClick when clicked', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    const regionElement = screen.getByTestId('regionitem-test-region-1');
    fireEvent.click(regionElement);

    expect(mockOnClick).toHaveBeenCalledWith('test-region-1');
  });

  it('should show editing users indicator', () => {
    const editingUsers = [
      { user: 'user1', color: '#ff0000' },
      { user: 'user2', color: '#00ff00' },
    ];

    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        editingUsers={editingUsers}
        onClick={mockOnClick}
      />
    );

    // Should show editing indicator (this would be in the DOM as HTML)
    const container = screen.getByTestId('regionitem-test-region-1');
    expect(container.innerHTML).toContain('user1');
    expect(container.innerHTML).toContain('user2');
  });

  it('should return null for non-existent region', () => {
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: () => null,
        knownWords: mockKnownWords,
      } as any;
      
      return selector(mockState);
    });

    const { container } = render(
      <RegionItem
        regionId="non-existent-region"
        index={0}
        onClick={mockOnClick}
      />
    );

    expect(container.firstChild).toBeNull();
  });
}); 