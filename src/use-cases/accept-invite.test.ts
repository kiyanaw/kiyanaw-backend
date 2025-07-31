import { AcceptInviteUseCase, AcceptInviteConfig, AcceptInviteResult } from './accept-invite';

// Mock the services
jest.mock('../services');

// Mock the invite store
jest.mock('../stores/useInviteStore', () => ({
  useInviteStore: {
    getState: jest.fn(() => ({
      markInviteAsAccepted: jest.fn()
    }))
  }
}));

describe('AcceptInviteUseCase', () => {
  const mockAcceptInvite = jest.fn();
  const mockMarkInviteAsAccepted = jest.fn();

  const mockServices = {
    inviteService: {
      acceptInvite: mockAcceptInvite,
    },
  };

  let validConfig: AcceptInviteConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store mock
    const { useInviteStore } = require('../stores/useInviteStore');
    useInviteStore.getState.mockReturnValue({
      markInviteAsAccepted: mockMarkInviteAsAccepted
    });
    
    // Setup valid config
    validConfig = {
      inviteId: 'invite-123',
      userEmail: 'test@example.com',
      userId: 'user-456',
      services: mockServices as any
    };

    // Setup default mock return
    mockAcceptInvite.mockResolvedValue({
      message: 'Invitation accepted successfully',
      invite: {
        inviteId: 'invite-123',
        email: 'test@example.com',
        permissionLevel: 'viewer',
        transcriptionId: 'transcription-789',
        invitedBy: 'user-999',
        invitedByFriendly: 'inviter@example.com',
        acceptedAt: '2024-01-01T00:00:00.000Z',
        status: 'accepted'
      }
    });
  });

  describe('validation', () => {
    it('should throw error when inviteId is missing', async () => {
      const config = { ...validConfig, inviteId: '' };
      const useCase = new AcceptInviteUseCase(config);
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw error when userEmail is missing', async () => {
      const config = { ...validConfig, userEmail: '' };
      const useCase = new AcceptInviteUseCase(config);
      await expect(useCase.execute()).rejects.toThrow('User email is required');
    });

    it('should throw error when userId is missing', async () => {
      const config = { ...validConfig, userId: '' };
      const useCase = new AcceptInviteUseCase(config);
      await expect(useCase.execute()).rejects.toThrow('User ID is required');
    });



    it('should throw error when userEmail has invalid format', async () => {
      const config = { ...validConfig, userEmail: 'invalid-email' };
      const useCase = new AcceptInviteUseCase(config);
      await expect(useCase.execute()).rejects.toThrow('Invalid email format');
    });
  });

  describe('execute', () => {
    it('should call validation before executing', async () => {
      const invalidConfig = { ...validConfig, inviteId: '' };
      const useCase = new AcceptInviteUseCase(invalidConfig);

      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
      
      // Should not call service if validation fails
      expect(mockAcceptInvite).not.toHaveBeenCalled();
      expect(mockMarkInviteAsAccepted).not.toHaveBeenCalled();
    });

    it('should call inviteService.acceptInvite with correct parameters', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockAcceptInvite).toHaveBeenCalledWith({
        inviteId: 'invite-123',
        userEmail: 'test@example.com',
        userId: 'user-456'
      });
    });

    it('should call store markInviteAsAccepted after successful acceptance', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockAcceptInvite).toHaveBeenCalledWith({
        inviteId: 'invite-123',
        userEmail: 'test@example.com',
        userId: 'user-456'
      });
      
      // Verify store method was called directly
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledWith('invite-123');
    });

    it('should return the result from inviteService.acceptInvite', async () => {
      const expectedResult: AcceptInviteResult = {
        message: 'Custom acceptance message',
        invite: {
          inviteId: 'invite-123',
          email: 'test@example.com',
          permissionLevel: 'editor',
          transcriptionId: 'transcription-789',
          invitedBy: 'user-999',
          invitedByFriendly: 'inviter@example.com',
          acceptedAt: '2024-01-01T00:00:00.000Z',
          status: 'accepted'
        }
      };

      mockAcceptInvite.mockResolvedValue(expectedResult);

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors without calling store update', async () => {
      const serviceError = new Error('Service failed');
      mockAcceptInvite.mockRejectedValue(serviceError);

      const useCase = new AcceptInviteUseCase(validConfig);

      await expect(useCase.execute()).rejects.toThrow('Service failed');
      
      // Should not call store update if service fails
      expect(mockMarkInviteAsAccepted).not.toHaveBeenCalled();
    });

    it('should work with different permission levels', async () => {
      const editorResult = {
        message: 'Invitation accepted successfully',
        invite: {
          inviteId: 'invite-123',
          email: 'test@example.com',
          permissionLevel: 'editor' as const,
          transcriptionId: 'transcription-789',
          invitedBy: 'user-999',
          invitedByFriendly: 'inviter@example.com',
          acceptedAt: '2024-01-01T00:00:00.000Z',
          status: 'accepted'
        }
      };

      mockAcceptInvite.mockResolvedValue(editorResult);

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.invite.permissionLevel).toBe('editor');
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledWith('invite-123');
    });
  });

  describe('Use Case Architecture Compliance', () => {
    it('should be stateless - multiple instances should not interfere', async () => {
      mockAcceptInvite
        .mockResolvedValueOnce({
          message: 'First invitation accepted',
          invite: {
            inviteId: 'invite-1',
            email: 'user1@example.com',
            permissionLevel: 'viewer',
            transcriptionId: 'transcription-1',
            invitedBy: 'user-999',
            invitedByFriendly: 'inviter@example.com',
            acceptedAt: '2024-01-01T00:00:00.000Z',
            status: 'accepted'
          }
        })
        .mockResolvedValueOnce({
          message: 'Second invitation accepted',
          invite: {
            inviteId: 'invite-2',
            email: 'user2@example.com',
            permissionLevel: 'editor',
            transcriptionId: 'transcription-2',
            invitedBy: 'user-999',
            invitedByFriendly: 'inviter@example.com',
            acceptedAt: '2024-01-01T00:00:00.000Z',
            status: 'accepted'
          }
        });

      const config1 = {
        ...validConfig,
        inviteId: 'invite-1',
        userEmail: 'user1@example.com'
      };

      const config2 = {
        ...validConfig,
        inviteId: 'invite-2',
        userEmail: 'user2@example.com'
      };

      const useCase1 = new AcceptInviteUseCase(config1);
      const useCase2 = new AcceptInviteUseCase(config2);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.invite.inviteId).toBe('invite-1');
      expect(result1.invite.permissionLevel).toBe('viewer');
      expect(result2.invite.inviteId).toBe('invite-2');
      expect(result2.invite.permissionLevel).toBe('editor');

      // Both should update their respective stores
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledWith('invite-1');
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledWith('invite-2');
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledTimes(2);
    });

    it('should not mutate input configuration', async () => {
      const originalInviteId = 'original-invite-123';
      const originalUserEmail = 'original@example.com';
      
      const config = {
        ...validConfig,
        inviteId: originalInviteId,
        userEmail: originalUserEmail
      };

      const useCase = new AcceptInviteUseCase(config);
      await useCase.execute();

      expect(config.inviteId).toBe(originalInviteId);
      expect(config.userEmail).toBe(originalUserEmail);
    });
  });

  describe('store integration', () => {
    it('should access store directly to update count after acceptance', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      await useCase.execute();

      // Verify the store was accessed and method called with correct invite ID
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledWith('invite-123');
      expect(mockMarkInviteAsAccepted).toHaveBeenCalledTimes(1);
    });

    it('should handle store update errors gracefully', async () => {
      // Mock store function to throw error
      const storeError = new Error('Store update failed');
      mockMarkInviteAsAccepted.mockImplementation(() => {
        throw storeError;
      });

      const useCase = new AcceptInviteUseCase(validConfig);

      // Should still throw the store error
      await expect(useCase.execute()).rejects.toThrow('Store update failed');
      
      // But the service should have been called successfully first
      expect(mockAcceptInvite).toHaveBeenCalledWith({
        inviteId: 'invite-123',
        userEmail: 'test@example.com',
        userId: 'user-456'
      });
    });
  });
}); 