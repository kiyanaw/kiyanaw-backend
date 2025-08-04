import { renderHook, act } from '@testing-library/react';
import { useFlashIndicator } from './useFlashIndicator';
import { flashIndicatorService, FLASH_CONFIG } from '../services/flashIndicatorService';

// Mock the flash indicator service
jest.mock('../services/flashIndicatorService', () => ({
  flashIndicatorService: {
    onFlash: jest.fn(),
  },
  FLASH_CONFIG: {
    usernameVisibleDuration: 2500,
    textFadeDuration: 300,
  },
}));

describe('useFlashIndicator', () => {
  let mockOnFlash: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUnsubscribe = jest.fn();
    mockOnFlash = jest.mocked(flashIndicatorService.onFlash);
    mockOnFlash.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return null initially', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    expect(result.current).toBeNull();
  });

  it('should register flash listener on mount', () => {
    const regionId = 'test-region-123';
    
    renderHook(() => useFlashIndicator(regionId));
    
    expect(mockOnFlash).toHaveBeenCalledWith(regionId, expect.any(Function));
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useFlashIndicator('test-region'));
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should set initial flash state when flash event fires', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    // Get the callback that was registered
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger flash
    act(() => {
      flashCallback('testuser');
    });
    
    expect(result.current).toEqual({
      username: 'testuser',
      isFlashing: true,
      opacity: 1
    });
  });

  it('should start fade after visible duration', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger flash
    act(() => {
      flashCallback('testuser');
    });
    
    // Initial state should be flashing
    expect(result.current?.isFlashing).toBe(true);
    expect(result.current?.opacity).toBe(1);
    
    // Fast-forward to when fade should start
    act(() => {
      jest.advanceTimersByTime(FLASH_CONFIG.usernameVisibleDuration);
    });
    
    // Should start fading
    expect(result.current?.isFlashing).toBe(false);
    expect(result.current?.opacity).toBe(0);
  });

  it('should clear state after total duration', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger flash
    act(() => {
      flashCallback('testuser');
    });
    
    expect(result.current).not.toBeNull();
    
    // Fast-forward past total duration
    const totalDuration = FLASH_CONFIG.usernameVisibleDuration + FLASH_CONFIG.textFadeDuration + 100;
    act(() => {
      jest.advanceTimersByTime(totalDuration);
    });
    
    // Should be cleared
    expect(result.current).toBeNull();
  });

  it('should reset timing when new flash event fires during existing flash', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger first flash
    act(() => {
      flashCallback('user1');
    });
    
    // Advance part way through
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Trigger second flash (should reset)
    act(() => {
      flashCallback('user2');
    });
    
    // Should show new user and reset to bright state
    expect(result.current).toEqual({
      username: 'user2',
      isFlashing: true,
      opacity: 1
    });
    
    // Original timing should be cancelled - advance by original visible duration
    act(() => {
      jest.advanceTimersByTime(FLASH_CONFIG.usernameVisibleDuration);
    });
    
    // Should still be in fade state (not cleared)
    expect(result.current?.isFlashing).toBe(false);
    expect(result.current?.opacity).toBe(0);
  });

  it('should re-register listener when regionId changes', () => {
    const { rerender } = renderHook(
      ({ regionId }) => useFlashIndicator(regionId),
      { initialProps: { regionId: 'region1' } }
    );
    
    // Should unsubscribe from old region
    rerender({ regionId: 'region2' });
    
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockOnFlash).toHaveBeenCalledWith('region2', expect.any(Function));
  });

  it('should clean up timeouts on unmount', () => {
    const { result, unmount } = renderHook(() => useFlashIndicator('test-region'));
    
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger flash
    act(() => {
      flashCallback('testuser');
    });
    
    // Unmount before timeouts complete
    unmount();
    
    // Should not throw when timeouts would have fired
    expect(() => {
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('should handle multiple rapid flash events correctly', () => {
    const { result } = renderHook(() => useFlashIndicator('test-region'));
    
    const flashCallback = mockOnFlash.mock.calls[0][1];
    
    // Trigger multiple flashes rapidly
    act(() => {
      flashCallback('user1');
      flashCallback('user2');
      flashCallback('user3');
    });
    
    // Should show the last user
    expect(result.current?.username).toBe('user3');
    expect(result.current?.isFlashing).toBe(true);
    expect(result.current?.opacity).toBe(1);
  });
}); 