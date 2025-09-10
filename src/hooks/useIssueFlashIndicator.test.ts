import { renderHook, act } from '@testing-library/react';
import { useIssueFlashIndicator } from './useIssueFlashIndicator';
import { flashIndicatorService, FLASH_CONFIG } from '../services/flashIndicatorService';

jest.mock('../services/flashIndicatorService', () => ({
  flashIndicatorService: {
    onIssueFlash: jest.fn()
  },
  FLASH_CONFIG: {
    usernameVisibleDuration: 2500,
    textFadeDuration: 300,
    textEasing: 'ease-out'
  }
}));

const mockFlashService = jest.mocked(flashIndicatorService);

describe('useIssueFlashIndicator', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUnsubscribe = jest.fn();
    mockFlashService.onIssueFlash.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null initially', () => {
    const { result } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    expect(result.current).toBeNull();
  });

  it('should subscribe to flash events for the given issue ID', () => {
    const issueId = 'test-issue-123';
    renderHook(() => useIssueFlashIndicator(issueId));
    
    expect(mockFlashService.onIssueFlash).toHaveBeenCalledWith(
      issueId,
      expect.any(Function)
    );
  });

  it('should set flash state when callback is triggered', () => {
    const { result } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    // Get the callback function passed to onIssueFlash
    const flashCallback = mockFlashService.onIssueFlash.mock.calls[0][1];
    
    act(() => {
      flashCallback('testuser');
    });
    
    expect(result.current).toEqual({
      username: 'testuser',
      isFlashing: true,
      opacity: 1
    });
  });

  it('should fade out after visible duration', () => {
    const { result } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    const flashCallback = mockFlashService.onIssueFlash.mock.calls[0][1];
    
    act(() => {
      flashCallback('testuser');
    });
    
    // Initially flashing
    expect(result.current?.isFlashing).toBe(true);
    expect(result.current?.opacity).toBe(1);
    
    // Fast forward to fade start
    act(() => {
      jest.advanceTimersByTime(FLASH_CONFIG.usernameVisibleDuration);
    });
    
    expect(result.current?.isFlashing).toBe(false);
    expect(result.current?.opacity).toBe(0);
  });

  it('should clear state completely after fade duration', () => {
    const { result } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    const flashCallback = mockFlashService.onIssueFlash.mock.calls[0][1];
    
    act(() => {
      flashCallback('testuser');
    });
    
    expect(result.current).not.toBeNull();
    
    // Fast forward past both visible and fade durations
    act(() => {
      jest.advanceTimersByTime(
        FLASH_CONFIG.usernameVisibleDuration + 
        FLASH_CONFIG.textFadeDuration + 
        100 // buffer
      );
    });
    
    expect(result.current).toBeNull();
  });

  it('should restart fade cycle when new flash triggered during existing flash', () => {
    const { result } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    const flashCallback = mockFlashService.onIssueFlash.mock.calls[0][1];
    
    // Start first flash
    act(() => {
      flashCallback('user1');
    });
    
    expect(result.current?.username).toBe('user1');
    
    // Fast forward halfway through visible duration
    act(() => {
      jest.advanceTimersByTime(FLASH_CONFIG.usernameVisibleDuration / 2);
    });
    
    // Trigger second flash
    act(() => {
      flashCallback('user2');
    });
    
    // Should reset to bright flash with new username
    expect(result.current).toEqual({
      username: 'user2',
      isFlashing: true,
      opacity: 1
    });
    
    // Original timeout should not affect new flash
    act(() => {
      jest.advanceTimersByTime(FLASH_CONFIG.usernameVisibleDuration / 2);
    });
    
    // Should still be bright (not faded)
    expect(result.current?.isFlashing).toBe(true);
    expect(result.current?.opacity).toBe(1);
  });

  it('should unsubscribe when component unmounts', () => {
    const { unmount } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should clear timeouts when component unmounts', () => {
    const { result, unmount } = renderHook(() => useIssueFlashIndicator('test-issue'));
    
    const flashCallback = mockFlashService.onIssueFlash.mock.calls[0][1];
    
    // Start flash
    act(() => {
      flashCallback('testuser');
    });
    
    expect(result.current).not.toBeNull();
    
    // Unmount before timeouts complete
    unmount();
    
    // Fast forward past timeout durations
    act(() => {
      jest.advanceTimersByTime(
        FLASH_CONFIG.usernameVisibleDuration + 
        FLASH_CONFIG.textFadeDuration + 
        1000
      );
    });
    
    // Should not cause any issues (no memory leaks)
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should resubscribe when issue ID changes', () => {
    const { rerender } = renderHook(
      ({ issueId }) => useIssueFlashIndicator(issueId),
      { initialProps: { issueId: 'issue-1' } }
    );
    
    expect(mockFlashService.onIssueFlash).toHaveBeenCalledWith('issue-1', expect.any(Function));
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    
    // Change issue ID
    rerender({ issueId: 'issue-2' });
    
    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockFlashService.onIssueFlash).toHaveBeenCalledWith('issue-2', expect.any(Function));
  });
});