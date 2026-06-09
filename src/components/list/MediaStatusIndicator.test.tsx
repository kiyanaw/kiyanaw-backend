import React from 'react';
import { render, screen } from '@testing-library/react';
import { MediaStatusIndicator } from './MediaStatusIndicator';

describe('MediaStatusIndicator', () => {
  it('renders a spinner for PENDING status', () => {
    render(<MediaStatusIndicator status="PENDING" />);
    expect(screen.getByTestId('media-status-indicator')).toBeInTheDocument();
    expect(screen.getByTitle('Processing media…')).toBeInTheDocument();
  });

  it('renders a spinner for PROCESSING status', () => {
    render(<MediaStatusIndicator status="PROCESSING" />);
    expect(screen.getByTestId('media-status-indicator')).toBeInTheDocument();
    expect(screen.getByTitle('Processing media…')).toBeInTheDocument();
  });

  it('renders an error icon for ERROR status', () => {
    render(<MediaStatusIndicator status="ERROR" />);
    expect(screen.getByTestId('media-status-indicator')).toBeInTheDocument();
    expect(screen.getByTitle('Media processing failed')).toBeInTheDocument();
  });

  it('renders nothing for READY status', () => {
    const { container } = render(<MediaStatusIndicator status="READY" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when status is undefined', () => {
    const { container } = render(<MediaStatusIndicator status={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
