import { render } from '@testing-library/react';
import { SyncIndicator } from './SyncIndicator';

describe('SyncIndicator', () => {
  it('should render nothing when status is null', () => {
    const { container } = render(<SyncIndicator status={null} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render syncing spinner when status is "syncing"', () => {
    const { container, getByTitle } = render(<SyncIndicator status="syncing" />);
    
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center', 'w-3', 'h-3', 'ml-1');
    expect(getByTitle('Syncing latest changes...')).toBeInTheDocument();
    
    // Check for spinner SVG
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('text-blue-500', 'animate-spin');
  });

  it('should render checkmark when status is "synced"', () => {
    const { container, getByTitle } = render(<SyncIndicator status="synced" />);
    
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center', 'w-3', 'h-3', 'ml-1');
    expect(getByTitle('Data is up to date')).toBeInTheDocument();
    
    // Check for checkmark SVG
    const checkmark = container.querySelector('svg');
    expect(checkmark).toBeInTheDocument();
    expect(checkmark).toHaveClass('text-green-500');
  });

  it('should have correct sizing for spinner', () => {
    const { container } = render(<SyncIndicator status="syncing" />);
    
    const spinner = container.querySelector('svg');
    expect(spinner).toHaveAttribute('width', '12');
    expect(spinner).toHaveAttribute('height', '12');
  });

  it('should have correct sizing for checkmark', () => {
    const { container } = render(<SyncIndicator status="synced" />);
    
    const checkmark = container.querySelector('svg');
    expect(checkmark).toHaveAttribute('width', '12');
    expect(checkmark).toHaveAttribute('height', '12');
  });

  it('should have appropriate title attributes for accessibility', () => {
    const { rerender, getByTitle } = render(<SyncIndicator status="syncing" />);
    
    expect(getByTitle('Syncing latest changes...')).toBeInTheDocument();
    
    rerender(<SyncIndicator status="synced" />);
    expect(getByTitle('Data is up to date')).toBeInTheDocument();
  });

  it('should maintain consistent container styling across states', () => {
    const { container, rerender } = render(<SyncIndicator status="syncing" />);
    const syncingContainer = container.firstChild;
    
    rerender(<SyncIndicator status="synced" />);
    const syncedContainer = container.firstChild;
    
    // Both should have the same container classes
    expect(syncingContainer).toHaveClass('flex', 'items-center', 'justify-center', 'w-3', 'h-3', 'ml-1');
    expect(syncedContainer).toHaveClass('flex', 'items-center', 'justify-center', 'w-3', 'h-3', 'ml-1');
  });

  it('should handle rapid status changes', () => {
    const { container, rerender } = render(<SyncIndicator status={null} />);
    expect(container.firstChild).toBeNull();
    
    rerender(<SyncIndicator status="syncing" />);
    expect(container.querySelector('svg')).toHaveClass('animate-spin');
    
    rerender(<SyncIndicator status="synced" />);
    expect(container.querySelector('svg')).toHaveClass('text-green-500');
    
    rerender(<SyncIndicator status={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe('visual consistency', () => {
    it('should use consistent icon sizing', () => {
      const { container: syncingContainer } = render(<SyncIndicator status="syncing" />);
      const { container: syncedContainer } = render(<SyncIndicator status="synced" />);
      
      const syncingIcon = syncingContainer.querySelector('svg');
      const syncedIcon = syncedContainer.querySelector('svg');
      
      expect(syncingIcon).toHaveAttribute('width', '12');
      expect(syncingIcon).toHaveAttribute('height', '12');
      expect(syncedIcon).toHaveAttribute('width', '12');
      expect(syncedIcon).toHaveAttribute('height', '12');
    });

    it('should use appropriate colors for different states', () => {
      const { container: syncingContainer } = render(<SyncIndicator status="syncing" />);
      const { container: syncedContainer } = render(<SyncIndicator status="synced" />);
      
      const syncingIcon = syncingContainer.querySelector('svg');
      const syncedIcon = syncedContainer.querySelector('svg');
      
      expect(syncingIcon).toHaveClass('text-blue-500');
      expect(syncedIcon).toHaveClass('text-green-500');
    });
  });
});
