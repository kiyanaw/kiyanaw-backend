import { RevokeInviteUseCase, RevokeInviteConfig, RevokeInviteResult } from './revoke-invite';

// Mock the services
jest.mock('../services');

describe('RevokeInviteUseCase', () => {
  const mockRevokeInvite = jest.fn();

  const mockServices = {
    inviteService: {
      revokeInvite: mockRevokeInvite,
    },
  };

  let validConfig: RevokeInviteConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup valid config
    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      services: mockServices as any
    };

    // Setup default mock return
    mockRevokeInvite.mockResolvedValue({
      message: 'Invitation revoked successfully',
      inviteId: 'invite-123',
      email: 'test@example.com',
      transcriptionId: 'transcription-789',
      wasAccepted: true,
      permissionLevel: 'viewer'
    });
  });

  describe('validation', () => {
    describe('inviteId validation', () => {
      it('should throw error when inviteId is missing', async () => {
        const config = { ...validConfig, inviteId: '' };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
      });

      it('should throw error when inviteId is undefined', async () => {
        const config = { ...validConfig, inviteId: undefined as any };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
      });

      it('should throw error when inviteId is only whitespace', async () => {
        const config = { ...validConfig, inviteId: '   ' };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
      });
    });

    describe('requestorUserId validation', () => {
      it('should throw error when requestorUserId is missing', async () => {
        const config = { ...validConfig, requestorUserId: '' };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
      });

      it('should throw error when requestorUserId is undefined', async () => {
        const config = { ...validConfig, requestorUserId: undefined as any };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
      });

      it('should throw error when requestorUserId is only whitespace', async () => {
        const config = { ...validConfig, requestorUserId: '   ' };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
      });
    });

    describe('services validation', () => {
      it('should throw error when services is undefined', async () => {
        const config = { ...validConfig, services: undefined as any };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Services are required');
      });

      it('should throw error when inviteService is missing', async () => {
        const config = { ...validConfig, services: {} as any };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Invite service is required');
      });

      it('should throw error when revokeInvite function is missing', async () => {
        const config = {
          ...validConfig,
          services: { inviteService: {} } as any
        };
        const useCase = new RevokeInviteUseCase(config);
        await expect(useCase.execute()).rejects.toThrow('Revoke invite function is required');
      });
    });
  });

  describe('execute', () => {
    it('should call validation before executing', async () => {
      const invalidConfig = { ...validConfig, inviteId: '' };
      const useCase = new RevokeInviteUseCase(invalidConfig);

      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
      
      // Should not call service if validation fails
      expect(mockRevokeInvite).not.toHaveBeenCalled();
    });

    it('should call inviteService.revokeInvite with correct parameters', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockRevokeInvite).toHaveBeenCalledWith(
        'invite-123',
        'user-456'
      );
    });

    it('should return the result from inviteService.revokeInvite', async () => {
      const expectedResult: RevokeInviteResult = {
        message: 'Invitation revoked successfully',
        inviteId: 'invite-123',
        email: 'test@example.com',
        transcriptionId: 'transcription-789',
        wasAccepted: true,
        permissionLevel: 'viewer'
      };

      mockRevokeInvite.mockResolvedValue(expectedResult);

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Unauthorized: Only the person who sent the invite can revoke it');
      mockRevokeInvite.mockRejectedValue(serviceError);

      const useCase = new RevokeInviteUseCase(validConfig);

      await expect(useCase.execute()).rejects.toThrow('Unauthorized: Only the person who sent the invite can revoke it');
    });

    it('should handle revocation of pending invite', async () => {
      const pendingResult: RevokeInviteResult = {
        message: 'Invitation revoked successfully',
        inviteId: 'invite-123',
        email: 'test@example.com',
        transcriptionId: 'transcription-789',
        wasAccepted: false,
        permissionLevel: 'editor'
      };

      mockRevokeInvite.mockResolvedValue(pendingResult);

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.wasAccepted).toBe(false);
      expect(result.permissionLevel).toBe('editor');
    });

    it('should handle revocation of accepted invite', async () => {
      const acceptedResult: RevokeInviteResult = {
        message: 'Invitation revoked successfully',
        inviteId: 'invite-123',
        email: 'test@example.com',
        transcriptionId: 'transcription-789',
        wasAccepted: true,
        permissionLevel: 'viewer'
      };

      mockRevokeInvite.mockResolvedValue(acceptedResult);

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.wasAccepted).toBe(true);
      expect(result.permissionLevel).toBe('viewer');
    });

    it('should work with different user and invite IDs', async () => {
      const config = {
        ...validConfig,
        inviteId: 'different-invite-456',
        requestorUserId: 'different-user-789'
      };

      const useCase = new RevokeInviteUseCase(config);
      await useCase.execute();

      expect(mockRevokeInvite).toHaveBeenCalledWith(
        'different-invite-456',
        'different-user-789'
      );
    });
  });

  describe('Use Case Architecture Compliance', () => {
    it('should be stateless - multiple instances should not interfere', async () => {
      mockRevokeInvite
        .mockResolvedValueOnce({
          message: 'Invitation 1 revoked',
          inviteId: 'invite-1',
          email: 'user1@example.com',
          transcriptionId: 'transcription-1',
          wasAccepted: true,
          permissionLevel: 'viewer'
        })
        .mockResolvedValueOnce({
          message: 'Invitation 2 revoked',
          inviteId: 'invite-2',
          email: 'user2@example.com',
          transcriptionId: 'transcription-2',
          wasAccepted: false,
          permissionLevel: 'editor'
        });

      const config1 = {
        ...validConfig,
        inviteId: 'invite-1',
        requestorUserId: 'user-1'
      };

      const config2 = {
        ...validConfig,
        inviteId: 'invite-2',
        requestorUserId: 'user-2'
      };

      const useCase1 = new RevokeInviteUseCase(config1);
      const useCase2 = new RevokeInviteUseCase(config2);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.inviteId).toBe('invite-1');
      expect(result1.wasAccepted).toBe(true);
      expect(result2.inviteId).toBe('invite-2');
      expect(result2.wasAccepted).toBe(false);
    });

    it('should not mutate input configuration', async () => {
      const originalInviteId = 'original-invite-123';
      const originalUserId = 'original-user-456';
      
      const config = {
        ...validConfig,
        inviteId: originalInviteId,
        requestorUserId: originalUserId
      };

      const useCase = new RevokeInviteUseCase(config);
      await useCase.execute();

      expect(config.inviteId).toBe(originalInviteId);
      expect(config.requestorUserId).toBe(originalUserId);
    });

    it('should handle concurrent executions correctly', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);

      // Simulate concurrent calls (same invite, should still work)
      const promise1 = useCase.execute();
      const promise2 = useCase.execute();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.inviteId).toBe('invite-123');
      expect(result2.inviteId).toBe('invite-123');
      expect(mockRevokeInvite).toHaveBeenCalledTimes(2);
    });
  });

  describe('error message quality', () => {
    it('should provide specific error messages for different validation failures', async () => {
      const testCases = [
        { field: 'inviteId', value: '', expectedError: 'Invite ID is required' },
        { field: 'inviteId', value: undefined, expectedError: 'Invite ID is required' },
        { field: 'requestorUserId', value: '', expectedError: 'Requestor user ID is required' },
        { field: 'requestorUserId', value: undefined, expectedError: 'Requestor user ID is required' },
        { field: 'services', value: undefined, expectedError: 'Services are required' }
      ];

      for (const { field, value, expectedError } of testCases) {
        const config = { ...validConfig, [field]: value };
        const useCase = new RevokeInviteUseCase(config);
        
        await expect(useCase.execute()).rejects.toThrow(expectedError);
      }
    });

    it('should provide specific error messages for service structure validation', async () => {
      const serviceTestCases = [
        { 
          services: {}, 
          expectedError: 'Invite service is required' 
        },
        { 
          services: { inviteService: {} }, 
          expectedError: 'Revoke invite function is required' 
        },
        { 
          services: { inviteService: { revokeInvite: null } }, 
          expectedError: 'Revoke invite function is required' 
        }
      ];

      for (const { services, expectedError } of serviceTestCases) {
        const config = { ...validConfig, services: services as any };
        const useCase = new RevokeInviteUseCase(config);
        
        await expect(useCase.execute()).rejects.toThrow(expectedError);
      }
    });
  });

  describe('permission level handling', () => {
    it('should handle different permission levels correctly', () => {
      const permissionLevels = ['viewer', 'editor'] as const;
      
      permissionLevels.forEach(async (permissionLevel) => {
        const result = {
          message: 'Invitation revoked successfully',
          inviteId: 'invite-123',
          email: 'test@example.com',
          transcriptionId: 'transcription-789',
          wasAccepted: true,
          permissionLevel
        };

        mockRevokeInvite.mockResolvedValue(result);

        const useCase = new RevokeInviteUseCase(validConfig);
        const actualResult = await useCase.execute();

        expect(actualResult.permissionLevel).toBe(permissionLevel);
      });
    });
  });
}); 