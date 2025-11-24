import { render, screen } from '@testing-library/react';
import { RegionContextBar } from './RegionContextBar';
import { useRegionContextBar } from '../../hooks/useRegionContextBar';

jest.mock('../../hooks/useRegionContextBar');

const mockUseRegionContextBar = useRegionContextBar as jest.MockedFunction<typeof useRegionContextBar>;

describe('RegionContextBar', () => {
  it('renders empty state when no analysis is provided', () => {
    mockUseRegionContextBar.mockReturnValue({
      cursorWord: null,
      cursorWordAnalysis: null,
      wordIndex: null,
      handleSelectAnalysis: jest.fn(),
    });

    const { container } = render(<RegionContextBar regionId="region-1" canEdit={false} />);
    
    expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
  });

  it('renders analysis pills when analysis is provided', () => {
    const mockAnalysis = {
      word: 'anihi',
      analysis: 'anihi+Pron+Dem+Med+I+Pl',
      allAnalysis: [
        'anihi+Pron+Dem+Med+I+Pl',
        'anihi+Pron+Dem+Med+A+Obv',
        'anihi+Pron+Def+Med+I+Pl',
      ],
    };

    mockUseRegionContextBar.mockReturnValue({
      cursorWord: 'anihi',
      cursorWordAnalysis: mockAnalysis,
      wordIndex: 0,
      handleSelectAnalysis: jest.fn(),
    });

    const { container } = render(<RegionContextBar regionId="region-1" canEdit={true} />);
    
    // Check that all analysis options are rendered
    expect(screen.getByText('anihi+Pron+Dem+Med+I+Pl')).toBeInTheDocument();
    expect(screen.getByText('anihi+Pron+Dem+Med+A+Obv')).toBeInTheDocument();
    expect(screen.getByText('anihi+Pron+Def+Med+I+Pl')).toBeInTheDocument();
    
    // Check that the selected analysis has the bold styling
    const selectedPill = screen.getByText('anihi+Pron+Dem+Med+I+Pl');
    expect(selectedPill).toHaveStyle({ fontWeight: 'bold' });
    
    // Check that non-selected pills don't have bold styling
    const nonSelectedPill = screen.getByText('anihi+Pron+Dem+Med+A+Obv');
    expect(nonSelectedPill).toHaveStyle({ fontWeight: 'normal' });
    
    // Check that scrollable container exists
    expect(container.querySelector('.scrollbar-hide')).toBeInTheDocument();
  });

  it('renders single analysis when only one option is available', () => {
    const mockAnalysis = {
      word: 'test',
      analysis: 'test+Ipc',
      allAnalysis: ['test+Ipc'],
    };

    mockUseRegionContextBar.mockReturnValue({
      cursorWord: 'test',
      cursorWordAnalysis: mockAnalysis,
      wordIndex: 0,
      handleSelectAnalysis: jest.fn(),
    });

    render(<RegionContextBar regionId="region-1" canEdit={true} />);
    
    expect(screen.getByText('test+Ipc')).toBeInTheDocument();
  });

  it('handles undefined cursorWord gracefully', () => {
    const mockAnalysis = {
      word: 'test',
      analysis: 'test+Ipc',
      allAnalysis: ['test+Ipc'],
    };

    mockUseRegionContextBar.mockReturnValue({
      cursorWord: null,
      cursorWordAnalysis: mockAnalysis,
      wordIndex: 0,
      handleSelectAnalysis: jest.fn(),
    });

    const { container } = render(<RegionContextBar regionId="region-1" canEdit={true} />);
    
    expect(screen.getByText('test+Ipc')).toBeInTheDocument();
    expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
  });
});

