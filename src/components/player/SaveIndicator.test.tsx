import { render, screen } from '@testing-library/react';
import { SaveIndicator } from './SaveIndicator';

describe('SaveIndicator', () => {
  it('should render green checkmark for saved status', () => {
    render(<SaveIndicator status="saved" />);
    
    const indicator = screen.getByTitle('All changes saved');
    expect(indicator).toBeInTheDocument();
    expect(indicator.querySelector('svg')).toHaveClass('text-green-500');
  });

  it('should render yellow clock for pending status', () => {
    render(<SaveIndicator status="pending" />);
    
    const indicator = screen.getByTitle('Changes pending save...');
    expect(indicator).toBeInTheDocument();
    expect(indicator.querySelector('svg')).toHaveClass('text-yellow-500');
  });

  it('should render spinning loader for saving status', () => {
    render(<SaveIndicator status="saving" />);
    
    const indicator = screen.getByTitle('Saving changes...');
    expect(indicator).toBeInTheDocument();
    expect(indicator.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('should render red error icon for error status', () => {
    render(<SaveIndicator status="error" />);
    
    const indicator = screen.getByTitle('Error saving changes');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-red-500');
  });
});
