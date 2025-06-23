import { render, screen, fireEvent } from '@testing-library/react';
import { RegionList } from './RegionList';
import { useEditorStore } from '../../stores/useEditorStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useSelectAndPlayRegion } from '../../hooks/useSelectAndPlayRegion';

// Mock the stores and hooks
jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: jest.fn(),
}));

jest.mock('../../stores/usePlayerStore', () => ({
  usePlayerStore: jest.fn(),
}));

jest.mock('../../hooks/useSelectAndPlayRegion', () => ({
  useSelectAndPlayRegion: jest.fn(),
}));

// Mock RegionItem component
jest.mock('./RegionItem', () => ({
  RegionItem: ({ regionId, index, onClick, disabled }: any) => (
    <div
      data-testid={`region-item-${regionId}`}
      data-disabled={disabled}
      onClick={() => onClick(regionId)}
    >
      Region {index + 1}: {regionId}
    </div>
  ),
}));

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockUsePlayerStore = usePlayerStore as jest.MockedFunction<typeof usePlayerStore>;
const mockUseSelectAndPlayRegion = useSelectAndPlayRegion as jest.MockedFunction<typeof useSelectAndPlayRegion>;

describe('RegionList', () => {
  const mockRegions = [
    { id: 'region-1', start: 0, end: 10 },
    { id: 'region-2', start: 15, end: 25 },
    { id: 'region-3', start: 30, end: 40 },
  ];

  const mockPlayRegion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useSelectAndPlayRegion
    mockUseSelectAndPlayRegion.mockReturnValue(mockPlayRegion);
    
    // Mock useEditorStore
    mockUseEditorStore.mockReturnValue(null); // selectedRegionId
    
    // Mock usePlayerStore - default to loaded and ready
    mockUsePlayerStore.mockReturnValue(true); // loadedAndReady
  });

  it('should render regions when loaded and ready', () => {
    render(<RegionList regions={mockRegions} />);

    expect(screen.getByText('Regions (3)')).toBeInTheDocument();
    expect(screen.getByTestId('region-item-region-1')).toBeInTheDocument();
    expect(screen.getByTestId('region-item-region-2')).toBeInTheDocument();
    expect(screen.getByTestId('region-item-region-3')).toBeInTheDocument();
  });

  it('should show loading overlay when not loaded and ready', () => {
    // Mock player store to return not ready
    mockUsePlayerStore.mockReturnValue(false);

    render(<RegionList regions={mockRegions} />);

    expect(screen.getByText('Loading audio...')).toBeInTheDocument();
  });

  it('should apply disabled state to region items when not loaded', () => {
    // Mock player store to return not ready
    mockUsePlayerStore.mockReturnValue(false);

    render(<RegionList regions={mockRegions} />);

    const regionItem1 = screen.getByTestId('region-item-region-1');
    const regionItem2 = screen.getByTestId('region-item-region-2');
    
    expect(regionItem1).toHaveAttribute('data-disabled', 'true');
    expect(regionItem2).toHaveAttribute('data-disabled', 'true');
  });

  it('should not apply disabled state to region items when loaded', () => {
    // Player store already mocked to return true by default
    render(<RegionList regions={mockRegions} />);

    const regionItem1 = screen.getByTestId('region-item-region-1');
    const regionItem2 = screen.getByTestId('region-item-region-2');
    
    expect(regionItem1).toHaveAttribute('data-disabled', 'false');
    expect(regionItem2).toHaveAttribute('data-disabled', 'false');
  });

  it('should call playRegion when region clicked and loaded', () => {
    render(<RegionList regions={mockRegions} />);

    const regionItem = screen.getByTestId('region-item-region-1');
    fireEvent.click(regionItem);

    expect(mockPlayRegion).toHaveBeenCalledWith('region-1');
  });

  it('should not call playRegion when region clicked and not loaded', () => {
    // Mock player store to return not ready
    mockUsePlayerStore.mockReturnValue(false);

    render(<RegionList regions={mockRegions} />);

    const regionItem = screen.getByTestId('region-item-region-1');
    fireEvent.click(regionItem);

    expect(mockPlayRegion).not.toHaveBeenCalled();
  });

  it('should apply opacity styling when not loaded', () => {
    // Mock player store to return not ready
    mockUsePlayerStore.mockReturnValue(false);

    const { container } = render(<RegionList regions={mockRegions} />);
    const listContainer = container.firstChild as HTMLElement;

    expect(listContainer).toHaveClass('opacity-60');
  });

  it('should not apply opacity styling when loaded', () => {
    const { container } = render(<RegionList regions={mockRegions} />);
    const listContainer = container.firstChild as HTMLElement;

    expect(listContainer).not.toHaveClass('opacity-60');
  });

  it('should show empty state when no regions', () => {
    render(<RegionList regions={[]} />);

    expect(screen.getByText('No regions yet')).toBeInTheDocument();
    expect(screen.getByText('Create regions by selecting audio in the waveform above.')).toBeInTheDocument();
  });
}); 