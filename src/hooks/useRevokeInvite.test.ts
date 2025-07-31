import { renderHook, act } from '@testing-library/react';
import { useRevokeInvite } from './useRevokeInvite';
import { RevokeInviteUseCase } from '../use-cases/revoke-invite';
import { useAuthStore } from '../stores/useAuthStore';

// Mock the use-case
jest.mock('../use-cases/revoke-invite');
const MockedRevokeInviteUseCase = RevokeInviteUseCase as jest.MockedClass<typeof RevokeInviteUseCase>;

// Mock the auth store
jest.mock('../stores/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));

// Mock services
jest.mock('../services', () => ({
  services: {
    inviteService: {
      revokeInvite: jest.fn(),
    },
  },
}));

const mockedUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('useRevokeInvite', () => {
  const mockUser = {
    username: 'test-user@example.com',
    userId: 'user-123',
    attributes: {
      email: 'test-user@example.com',
    },
  };

  const mockExecute = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the store selector to return the user
    mockedUseAuthStore.mockImplementation((selector: any) => {
      const state = { user: mockUser };
      return selector(state);
    });

    // Mock the use case constructor and execute method
    MockedRevokeInviteUseCase.mockImplementation(() => ({
      execute: mockExecute,
    }) as any);

    // Setup default successful response
    mockExecute.mockResolvedValue({
      message: 'Invitation revoked successfully',
      inviteId: 'invite-123',
      email: 'invitee@example.com',
      transcriptionId: 'transcription-456',
      wasAccepted: true,
      permissionLevel: 'viewer'
    });
  });

  describe('hook initialization', () => {
    it('should return a function', () => {
      const { result } = renderHook(() => useRevokeInvite());
      expect(typeof result.current).toBe('function');
    });

    it('should be memoized and return the same function on re-renders', () => {
      const { result, rerender } = renderHook(() => useRevokeInvite());
      const firstFunction = result.current;
      
      rerender();
      const secondFunction = result.current;
      
      expect(firstFunction).toBe(secondFunction);
    });
  });

  describe('authentication requirements', () => {
    it('should throw error when user is not authenticated', async () => {
      mockedUseAuthStore.mockImplementation((selector: any) => {
        const state = { user: null };
        return selector(state);
      });

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await expect(result.current('invite-123')).rejects.toThrow(
          'User must be authenticated to revoke invitations'
        );
      });

      expect(MockedRevokeInviteUseCase).not.toHaveBeenCalled();
    });

    it('should work when user is authenticated', async () => {
      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const revokeResult = await result.current('invite-123');
        expect(revokeResult.inviteId).toBe('invite-123');
      });

      expect(MockedRevokeInviteUseCase).toHaveBeenCalled();
    });
  });

  describe('use case integration', () => {
    it('should create RevokeInviteUseCase with correct parameters', async () => {
      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await result.current('invite-456');
      });

      expect(MockedRevokeInviteUseCase).toHaveBeenCalledWith({
        inviteId: 'invite-456',
        requestorUserId: 'user-123',
        services: expect.any(Object)
      });
    });

    it('should call execute on the use case', async () => {
      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await result.current('invite-789');
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should return the result from use case execution', async () => {
      const expectedResult = {
        message: 'Custom revocation message',
        inviteId: 'invite-123',
        email: 'custom@example.com',
        transcriptionId: 'transcription-999',
        wasAccepted: false,
        permissionLevel: 'editor' as const
      };

      mockExecute.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const actualResult = await result.current('invite-123');
        expect(actualResult).toEqual(expectedResult);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate use case errors', async () => {
      const useCaseError = new Error('Unauthorized: Only the person who sent the invite can revoke it');
      mockExecute.mockRejectedValue(useCaseError);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await expect(result.current('invite-123')).rejects.toThrow(
          'Unauthorized: Only the person who sent the invite can revoke it'
        );
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockExecute.mockRejectedValue(networkError);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await expect(result.current('invite-123')).rejects.toThrow(
          'Network connection failed'
        );
      });
    });

    it('should handle authorization errors', async () => {
      const authError = new Error('Invite not found');
      mockExecute.mockRejectedValue(authError);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        await expect(result.current('invite-123')).rejects.toThrow(
          'Invite not found'
        );
      });
    });
  });

  describe('different invite scenarios', () => {
    it('should handle revocation of pending invites', async () => {
      const pendingResult = {
        message: 'Pending invitation revoked',
        inviteId: 'invite-pending',
        email: 'pending@example.com',
        transcriptionId: 'transcription-123',
        wasAccepted: false,
        permissionLevel: 'viewer' as const
      };

      mockExecute.mockResolvedValue(pendingResult);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const actualResult = await result.current('invite-pending');
        expect(actualResult.wasAccepted).toBe(false);
        expect(actualResult.permissionLevel).toBe('viewer');
      });
    });

    it('should handle revocation of accepted invites', async () => {
      const acceptedResult = {
        message: 'Accepted invitation revoked',
        inviteId: 'invite-accepted',
        email: 'accepted@example.com',
        transcriptionId: 'transcription-456',
        wasAccepted: true,
        permissionLevel: 'editor' as const
      };

      mockExecute.mockResolvedValue(acceptedResult);

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const actualResult = await result.current('invite-accepted');
        expect(actualResult.wasAccepted).toBe(true);
        expect(actualResult.permissionLevel).toBe('editor');
      });
    });
  });

  describe('multiple invitations', () => {
    it('should handle revoking multiple invitations sequentially', async () => {
      mockExecute
        .mockResolvedValueOnce({
          message: 'First invitation revoked',
          inviteId: 'invite-1',
          email: 'user1@example.com',
          transcriptionId: 'transcription-1',
          wasAccepted: true,
          permissionLevel: 'viewer'
        })
        .mockResolvedValueOnce({
          message: 'Second invitation revoked',
          inviteId: 'invite-2',
          email: 'user2@example.com',
          transcriptionId: 'transcription-2',
          wasAccepted: false,
          permissionLevel: 'editor'
        });

      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const result1 = await result.current('invite-1');
        const result2 = await result.current('invite-2');

        expect(result1.inviteId).toBe('invite-1');
        expect(result1.wasAccepted).toBe(true);
        expect(result2.inviteId).toBe('invite-2');
        expect(result2.wasAccepted).toBe(false);
      });

      expect(MockedRevokeInviteUseCase).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent revocations', async () => {
      const { result } = renderHook(() => useRevokeInvite());

      await act(async () => {
        const promises = [
          result.current('invite-concurrent-1'),
          result.current('invite-concurrent-2')
        ];

        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(2);
        expect(results[0].inviteId).toBe('invite-123'); // Default mock response
        expect(results[1].inviteId).toBe('invite-123'); // Default mock response
      });

      expect(MockedRevokeInviteUseCase).toHaveBeenCalledTimes(2);
    });
  });

  describe('user context changes', () => {
    it('should use updated user information after auth state changes', () => {
      const { result, rerender } = renderHook(() => useRevokeInvite());

      // Change the mock to return a different user
      const newUser = {
        username: 'new-user@example.com',
        userId: 'user-999',
        attributes: {
          email: 'new-user@example.com',
        },
      };

      mockedUseAuthStore.mockImplementation((selector: any) => {
        const state = { user: newUser };
        return selector(state);
      });

      rerender();

      act(() => {
        result.current('invite-test');
      });

      expect(MockedRevokeInviteUseCase).toHaveBeenLastCalledWith({
        inviteId: 'invite-test',
        requestorUserId: 'user-999', // Should use the new user ID
        services: expect.any(Object)
      });
    });
  });
}); 