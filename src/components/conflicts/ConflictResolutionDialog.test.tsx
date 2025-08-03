import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import type { ConflictData } from '../../services/conflictResolutionService';

const mockConflict: ConflictData = {
  regionId: 'test-region',
  field: 'regionText',
  localValue: 'My local changes to the text',
  remoteValue: 'Someone else changed this text',
  localVersion: 5,
  remoteVersion: 6,
  remoteUserLastUpdated: 'alice.smith@example.com',
  timestamp: Date.now(),
  conflictId: 'test-conflict-123'
};

describe('ConflictResolutionDialog', () => {
  const mockOnResolve = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render conflict information correctly', () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Check header
    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText(/Someone else has modified the.*while you were editing/)).toBeInTheDocument();

    // Check version information
    expect(screen.getByText('Their Changes')).toBeInTheDocument();
    expect(screen.getByText(/Version 6.*Last updated by alice.smith/)).toBeInTheDocument();
    
    expect(screen.getByText('Your Changes')).toBeInTheDocument();
    expect(screen.getByText(/Version 5.*Your unsaved changes/)).toBeInTheDocument();

    // Check that diff highlighting is working - look for highlighted spans
    expect(document.querySelector('.bg-red-100')).toBeInTheDocument(); // Removed content
    expect(document.querySelector('.bg-green-100')).toBeInTheDocument(); // Added content
    
    // Check that the content areas exist with diff highlighting
    expect(document.querySelector('.bg-gray-50')).toBeInTheDocument(); // Content areas

    // Check resolution options
    expect(screen.getByText('Accept their changes')).toBeInTheDocument();
    expect(screen.getByText('Keep your changes')).toBeInTheDocument();
  });

  it('should handle translation field correctly', () => {
    const translationConflict = {
      ...mockConflict,
      field: 'translation' as const
    };

    render(
      <ConflictResolutionDialog
        conflict={translationConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Someone else has modified the.*while you were editing/)).toBeInTheDocument();
  });

  it('should enable resolve button only when option is selected', () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    const resolveButton = screen.getByText('Resolve Conflict');
    
    // Initially disabled
    expect(resolveButton).toBeDisabled();

    // Select an option
    const acceptRemoteRadio = screen.getByDisplayValue('accept_remote');
    fireEvent.click(acceptRemoteRadio);

    // Should be enabled now
    expect(resolveButton).toBeEnabled();
  });

  it('should call onResolve with correct action when accept remote is selected', async () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Select accept remote
    const acceptRemoteRadio = screen.getByDisplayValue('accept_remote');
    fireEvent.click(acceptRemoteRadio);

    // Click resolve
    const resolveButton = screen.getByText('Resolve Conflict');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith({ action: 'accept_remote' });
    });
  });

  it('should call onResolve with correct action when keep local is selected', async () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Select keep local
    const keepLocalRadio = screen.getByDisplayValue('keep_local');
    fireEvent.click(keepLocalRadio);

    // Click resolve
    const resolveButton = screen.getByText('Resolve Conflict');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith({ action: 'keep_local' });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should handle empty values gracefully', () => {
    const emptyConflict = {
      ...mockConflict,
      localValue: '',
      remoteValue: ''
    };

    render(
      <ConflictResolutionDialog
        conflict={emptyConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getAllByText('<empty>')).toHaveLength(2);
  });

  it('should have copy buttons for both versions', () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    const copyButtons = screen.getAllByText(/📋 Copy/);
    expect(copyButtons).toHaveLength(2);
    expect(screen.getByText('📋 Copy their text')).toBeInTheDocument();
    expect(screen.getByText('📋 Copy your text')).toBeInTheDocument();
  });

  it('should display username without email domain', () => {
    render(
      <ConflictResolutionDialog
        conflict={mockConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Should show username without @example.com
    expect(screen.getByText(/Last updated by alice.smith/)).toBeInTheDocument();
    expect(screen.queryByText(/alice.smith@example.com/)).not.toBeInTheDocument();
  });

  it('should handle missing remote user gracefully', () => {
    const conflictWithoutUser = {
      ...mockConflict,
      remoteUserLastUpdated: undefined
    };

    render(
      <ConflictResolutionDialog
        conflict={conflictWithoutUser}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Should fall back to "another user"
    expect(screen.getByText(/Last updated by another user/)).toBeInTheDocument();
  });

  it('should handle multi-field conflicts correctly', () => {
    const multiFieldConflict = {
      ...mockConflict,
      conflictingFields: [
        {
          field: 'regionText',
          localValue: 'My local text',
          remoteValue: 'Their remote text',
          fieldType: 'text' as const
        },
        {
          field: 'start',
          localValue: 10.5,
          remoteValue: 12.3,
          fieldType: 'number' as const
        },
        {
          field: 'translation',
          localValue: 'My translation',
          remoteValue: 'Their translation',
          fieldType: 'text' as const
        }
      ]
    };

    render(
      <ConflictResolutionDialog
        conflict={multiFieldConflict}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    );

    // Should show appropriate header text for multiple conflicts
    expect(screen.getByText(/Someone else has modified the.*content.*timing.*while you were editing/)).toBeInTheDocument();
    expect(screen.getByText(/these conflicts/)).toBeInTheDocument(); // Only appears in header
    expect(screen.getByText('Resolve Conflicts')).toBeInTheDocument(); // Button text for plural

    // Should show all conflicting field headers (only when multiple fields)
    expect(screen.getAllByText('Text')).toHaveLength(2); // Field header appears in both left and right columns
    expect(screen.getAllByText('Start Time')).toHaveLength(2); 
    expect(screen.getAllByText('Translation')).toHaveLength(2);

    // Should show formatted time values
    expect(screen.getByText('10.50s')).toBeInTheDocument(); // Local start time
    expect(screen.getByText('12.30s')).toBeInTheDocument(); // Remote start time

    // Should show copy buttons for text fields but not time fields
    expect(screen.getAllByText(/📋 Copy their/)).toHaveLength(2); // text and translation only
    expect(screen.getAllByText(/📋 Copy your/)).toHaveLength(2); // text and translation only
  });
}); 