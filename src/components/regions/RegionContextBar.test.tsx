import { render, screen } from '@testing-library/react';
import { RegionContextBar } from './RegionContextBar';
import { type WordAnalysis } from '../../services/adt';

describe('RegionContextBar', () => {
  it('renders empty state when no analysis is provided', () => {
    const { container } = render(
      <RegionContextBar 
        cursorWordAnalysis={null}
        cursorWord={undefined}
      />
    );
    
    expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
  });

  it('renders analysis pills when analysis is provided', () => {
    const mockAnalysis: WordAnalysis = {
      word: 'anihi',
      analysis: 'anihi+Pron+Dem+Med+I+Pl',
      allAnalysis: [
        'anihi+Pron+Dem+Med+I+Pl',
        'anihi+Pron+Dem+Med+A+Obv',
        'anihi+Pron+Def+Med+I+Pl',
      ],
    };

    const { container } = render(
      <RegionContextBar 
        cursorWordAnalysis={mockAnalysis}
        cursorWord="anihi"
      />
    );
    
    // Check that all analysis options are rendered
    expect(screen.getByText('anihi+Pron+Dem+Med+I+Pl')).toBeInTheDocument();
    expect(screen.getByText('anihi+Pron+Dem+Med+A+Obv')).toBeInTheDocument();
    expect(screen.getByText('anihi+Pron+Def+Med+I+Pl')).toBeInTheDocument();
    
    // Check that the selected analysis has the bold styling
    const selectedPill = screen.getByText('anihi+Pron+Dem+Med+I+Pl');
    expect(selectedPill).toHaveClass('font-bold');
    
    // Check that non-selected pills don't have bold styling
    const nonSelectedPill = screen.getByText('anihi+Pron+Dem+Med+A+Obv');
    expect(nonSelectedPill).not.toHaveClass('font-bold');
    
    // Check that scrollable container exists
    expect(container.querySelector('.scrollbar-hide')).toBeInTheDocument();
  });

  it('renders single analysis when only one option is available', () => {
    const mockAnalysis: WordAnalysis = {
      word: 'test',
      analysis: 'test+Ipc',
      allAnalysis: ['test+Ipc'],
    };

    render(
      <RegionContextBar 
        cursorWordAnalysis={mockAnalysis}
        cursorWord="test"
      />
    );
    
    expect(screen.getByText('test+Ipc')).toBeInTheDocument();
  });

  it('handles undefined cursorWord gracefully', () => {
    const mockAnalysis: WordAnalysis = {
      word: 'test',
      analysis: 'test+Ipc',
      allAnalysis: ['test+Ipc'],
    };

    const { container } = render(
      <RegionContextBar 
        cursorWordAnalysis={mockAnalysis}
        cursorWord={undefined}
      />
    );
    
    expect(screen.getByText('test+Ipc')).toBeInTheDocument();
    expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
  });
});

