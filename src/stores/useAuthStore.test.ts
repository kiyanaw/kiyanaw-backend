import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from './useAuthStore';
import type { AuthUser } from '../hooks/useAuth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().setUser(null);
  });

  it('should have initial state with user null and signedIn false', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.signedIn).toBe(false);
  });

  it('should set user and update signedIn to true when user is provided', () => {
    const { result } = renderHook(() => useAuthStore());
    const testUser: AuthUser = {
      username: 'testuser',
      userId: 'test-id-123',
      signInDetails: { method: 'password' },
    };

    act(() => {
      result.current.setUser(testUser);
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.signedIn).toBe(true);
  });

  it('should set user to null and signedIn to false when null is provided', () => {
    const { result } = renderHook(() => useAuthStore());
    const testUser: AuthUser = {
      username: 'testuser',
      userId: 'test-id-123',
    };

    // First set a user
    act(() => {
      result.current.setUser(testUser);
    });

    // Then set to null
    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.signedIn).toBe(false);
  });
}); 