import { render, screen, fireEvent } from '@testing-library/react';
import { RegionItem } from './RegionItem';
import { useEditorStore } from '../../stores/useEditorStore';
import { textHighlightService } from '../../services/textHighlightService';
import { issueHighlightService } from '../../services/issueHighlightService';

// Mock the store
jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: jest.fn(),
}));

// Mock the text highlight service
jest.mock('../../services/textHighlightService', () => ({
  textHighlightService: {
    generateHTML: jest.fn(),
    generateHTMLWithOptions: jest.fn(),
  },
}));

// Mock the issue highlight service
jest.mock('../../services/issueHighlightService', () => ({
  issueHighlightService: {
    convertIssuesToHighlights: jest.fn(),
  },
}));

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockTextHighlightService = textHighlightService as jest.Mocked<typeof textHighlightService>;
const mockIssueHighlightService = issueHighlightService as jest.Mocked<typeof issueHighlightService>;

describe('RegionItem', () => {
  const mockRegion = {
    id: 'test-region-1',
    start: 10.5,
    end: 25.8,
    regionText: 'Test region text with some words',
    translation: 'Test translation',
    isNote: false,
    regionAnalysis: [
      { word: 'Test', analysis: 'test+N+Sg', allAnalysis: ['test+N+Sg'] },
      { word: 'words', analysis: 'word+N+Pl', allAnalysis: ['word+N+Pl'] },
    ],
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the store selectors
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? mockRegion : null),
        getIssuesForRegion: () => [],
      } as any;
      
      return selector(mockState);
    });

    // Mock text highlight service
    mockTextHighlightService.generateHTML.mockReturnValue('<span class="known-word">Test</span> region text with some <span class="known-word">words</span>');
    mockTextHighlightService.generateHTMLWithOptions.mockReturnValue('<span class="known-word">Test</span> region text with some <span class="known-word">words</span>');
    
    // Mock issue highlight service
    mockIssueHighlightService.convertIssuesToHighlights.mockReturnValue([]);
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

  it('should render region text with highlighting from region analysis only', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Should use ONLY the region's own analysis, not global cache
    const expectedKnownWords = new Set(['Test', 'words']);
    const expectedAmbiguousWords = new Set();
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledWith(
      'Test region text with some words',
      { knownWords: expectedKnownWords, ambiguousWords: expectedAmbiguousWords, issues: [] }
    );
  });

  it('should re-render when regionAnalysis changes', () => {
    const { rerender } = render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
      />
    );

    // Initial call
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledTimes(1);

    // Update region analysis
    const updatedRegion = {
      ...mockRegion,
      regionAnalysis: [
        { word: 'Test', analysis: 'test+N+Sg', allAnalysis: ['test+N+Sg'] },
        { word: 'words', analysis: 'word+N+Pl', allAnalysis: ['word+N+Pl'] },
        { word: 'region', analysis: 'region+N+Sg', allAnalysis: ['region+N+Sg'] },
      ],
    };
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? updatedRegion : null),
        getIssuesForRegion: () => [],
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

    // Should call generateHTMLWithOptions again with updated analysis
    const expectedKnownWords = new Set(['Test', 'words', 'region']);
    const expectedAmbiguousWords = new Set();
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledTimes(2);
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenLastCalledWith(
      'Test region text with some words',
      { knownWords: expectedKnownWords, ambiguousWords: expectedAmbiguousWords, issues: [] }
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
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledTimes(1);

    // Update region text
    const updatedRegion = {
      ...mockRegion,
      regionText: 'Updated region text',
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? updatedRegion : null),
        getIssuesForRegion: () => [],
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

    // Should call generateHTMLWithOptions again with updated text
    const expectedKnownWords = new Set(['Test', 'words']);
    const expectedAmbiguousWords = new Set();
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledTimes(2);
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenLastCalledWith(
      'Updated region text',
      { knownWords: expectedKnownWords, ambiguousWords: expectedAmbiguousWords, issues: [] }
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
        getIssuesForRegion: () => [],
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
        getIssuesForRegion: () => [],
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

  it('should not call onClick when disabled and clicked', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
        disabled={true}
      />
    );

    const regionElement = screen.getByTestId('regionitem-test-region-1');
    fireEvent.click(regionElement);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should apply disabled styling when disabled', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
        disabled={true}
      />
    );

    const regionElement = screen.getByTestId('regionitem-test-region-1');
    expect(regionElement).toHaveClass('cursor-not-allowed');
    expect(regionElement).toHaveClass('opacity-50');
    expect(regionElement).not.toHaveClass('hover:bg-gray-50');
  });

  it('should apply normal styling when not disabled', () => {
    render(
      <RegionItem
        regionId="test-region-1"
        index={0}
        onClick={mockOnClick}
        disabled={false}
      />
    );

    const regionElement = screen.getByTestId('regionitem-test-region-1');
    expect(regionElement).toHaveClass('cursor-pointer');
    expect(regionElement).toHaveClass('hover:bg-gray-50');
    expect(regionElement).not.toHaveClass('cursor-not-allowed');
    expect(regionElement).not.toHaveClass('opacity-50');
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
        getIssuesForRegion: () => [],
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

  it('should handle region with no analysis', () => {
    const regionWithoutAnalysis = {
      ...mockRegion,
      regionAnalysis: undefined,
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? regionWithoutAnalysis : null),
        getIssuesForRegion: () => [],
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

    // Should call with empty knownWords set when no analysis exists
    const expectedKnownWords = new Set();
    const expectedAmbiguousWords = new Set();
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledWith(
      'Test region text with some words',
      { knownWords: expectedKnownWords, ambiguousWords: expectedAmbiguousWords, issues: [] }
    );
  });

  it('should handle region with empty analysis array', () => {
    const regionWithEmptyAnalysis = {
      ...mockRegion,
      regionAnalysis: [],
    };

    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        regionById: (id: string) => (id === 'test-region-1' ? regionWithEmptyAnalysis : null),
        getIssuesForRegion: () => [],
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

    // Should call with empty knownWords and ambiguousWords sets
    const expectedKnownWords = new Set();
    const expectedAmbiguousWords = new Set();
    expect(mockTextHighlightService.generateHTMLWithOptions).toHaveBeenCalledWith(
      'Test region text with some words',
      { knownWords: expectedKnownWords, ambiguousWords: expectedAmbiguousWords, issues: [] }
    );
  });
}); 