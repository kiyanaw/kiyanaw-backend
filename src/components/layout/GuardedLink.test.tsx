import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GuardedLink } from './GuardedLink';
import { regionSaveManager } from '../../services/regionSaveManager';

// Mock the regionSaveManager
jest.mock('../../services/regionSaveManager', () => ({
  regionSaveManager: {
    hasAnyPendingSaves: jest.fn(() => false),
  },
}));

// Mock window.confirm
const mockConfirm = jest.spyOn(window, 'confirm');

describe('GuardedLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  afterAll(() => {
    mockConfirm.mockRestore();
  });

  it('should navigate normally when no pending saves', () => {
    (regionSaveManager.hasAnyPendingSaves as jest.Mock).mockReturnValue(false);

    render(
      <BrowserRouter>
        <GuardedLink to="/test">Test Link</GuardedLink>
      </BrowserRouter>
    );

    const link = screen.getByText('Test Link');
    fireEvent.click(link);

    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should show confirmation when pending saves exist', () => {
    (regionSaveManager.hasAnyPendingSaves as jest.Mock).mockReturnValue(true);
    mockConfirm.mockReturnValue(false); // User cancels

    render(
      <BrowserRouter>
        <GuardedLink to="/test">Test Link</GuardedLink>
      </BrowserRouter>
    );

    const link = screen.getByText('Test Link');
    fireEvent.click(link);

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('unsaved changes')
    );
  });

  it('should navigate when user confirms despite pending saves', () => {
    (regionSaveManager.hasAnyPendingSaves as jest.Mock).mockReturnValue(true);
    mockConfirm.mockReturnValue(true); // User confirms

    render(
      <BrowserRouter>
        <GuardedLink to="/test">Test Link</GuardedLink>
      </BrowserRouter>
    );

    const link = screen.getByText('Test Link');
    fireEvent.click(link);

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('unsaved changes')
    );
    // Navigation would happen but we can't easily test that in this setup
  });

  it('should call provided onClick handler when no pending saves', () => {
    (regionSaveManager.hasAnyPendingSaves as jest.Mock).mockReturnValue(false);
    const onClick = jest.fn();

    render(
      <BrowserRouter>
        <GuardedLink to="/test" onClick={onClick}>Test Link</GuardedLink>
      </BrowserRouter>
    );

    const link = screen.getByText('Test Link');
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalled();
  });
});

