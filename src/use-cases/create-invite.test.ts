import { CreateInviteUseCase, CreateInviteConfig, CreateInviteResult } from './create-invite';

// Mock the services
jest.mock('../services');

describe('CreateInviteUseCase', () => {
  const mockSendInvite = jest.fn();

  const mockServices = {
    inviteService: {
      sendInvite: mockSendInvite,
    },
  };

  let validConfig: CreateInviteConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup valid config
    validConfig = {
      email: 'test@example.com',
      permissionLevel: 'editor',
      transcriptionId: 'transcription-123',
      transcriptionTitle: 'Test Transcription',
      invitedBy: 'user-123',
      invitedByFriendly: 'John Doe',
      services: mockServices as any
    };

    // Setup default mock return
    mockSendInvite.mockResolvedValue({
      messageId: 'test-message-123',
      inviteId: 'invite-123'
    });
  });

  describe('validation', () => {
    it('should validate all required fields are present', () => {
      const useCase = new CreateInviteUseCase(validConfig);
      expect(() => useCase.validate()).not.toThrow();
    });

    describe('email validation', () => {
      it('should throw error when email is missing', () => {
        const config = { ...validConfig, email: '' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Email is required');
      });

      it('should throw error when email is undefined', () => {
        const config = { ...validConfig, email: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Email is required');
      });

      it('should throw error when email is only whitespace', () => {
        const config = { ...validConfig, email: '   ' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Email is required');
      });

      it('should throw error when email format is invalid', () => {
        const invalidEmails = [
          'invalid-email',
          'test@',
          '@example.com',
          'test@example',
          'test.example.com',
          'test@.com',
          'test@example.'
        ];

        invalidEmails.forEach(email => {
          const config = { ...validConfig, email };
          const useCase = new CreateInviteUseCase(config);
          expect(() => useCase.validate()).toThrow('Please enter a valid email address');
        });
      });

      it('should accept valid email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'firstname.lastname@company.com',
          'user123@test123.com'
        ];

        validEmails.forEach(email => {
          const config = { ...validConfig, email };
          const useCase = new CreateInviteUseCase(config);
          expect(() => useCase.validate()).not.toThrow();
        });
      });
    });

    describe('permissionLevel validation', () => {
      it('should throw error when permissionLevel is missing', () => {
        const config = { ...validConfig, permissionLevel: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Permission level is required');
      });

      it('should throw error when permissionLevel is invalid', () => {
        const config = { ...validConfig, permissionLevel: 'admin' as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Permission level must be either "viewer" or "editor"');
      });

      it('should accept valid permission levels', () => {
        ['viewer', 'editor'].forEach(permissionLevel => {
          const config = { ...validConfig, permissionLevel: permissionLevel as 'viewer' | 'editor' };
          const useCase = new CreateInviteUseCase(config);
          expect(() => useCase.validate()).not.toThrow();
        });
      });
    });

    describe('transcriptionId validation', () => {
      it('should throw error when transcriptionId is missing', () => {
        const config = { ...validConfig, transcriptionId: '' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription ID is required');
      });

      it('should throw error when transcriptionId is undefined', () => {
        const config = { ...validConfig, transcriptionId: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription ID is required');
      });

      it('should throw error when transcriptionId is only whitespace', () => {
        const config = { ...validConfig, transcriptionId: '   ' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription ID is required');
      });
    });

    describe('transcriptionTitle validation', () => {
      it('should throw error when transcriptionTitle is missing', () => {
        const config = { ...validConfig, transcriptionTitle: '' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription title is required');
      });

      it('should throw error when transcriptionTitle is undefined', () => {
        const config = { ...validConfig, transcriptionTitle: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription title is required');
      });

      it('should throw error when transcriptionTitle is only whitespace', () => {
        const config = { ...validConfig, transcriptionTitle: '   ' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Transcription title is required');
      });
    });

    describe('invitedBy validation', () => {
      it('should throw error when invitedBy is missing', () => {
        const config = { ...validConfig, invitedBy: '' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter ID is required');
      });

      it('should throw error when invitedBy is undefined', () => {
        const config = { ...validConfig, invitedBy: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter ID is required');
      });

      it('should throw error when invitedBy is only whitespace', () => {
        const config = { ...validConfig, invitedBy: '   ' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter ID is required');
      });
    });

    describe('invitedByFriendly validation', () => {
      it('should throw error when invitedByFriendly is missing', () => {
        const config = { ...validConfig, invitedByFriendly: '' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter display name is required');
      });

      it('should throw error when invitedByFriendly is undefined', () => {
        const config = { ...validConfig, invitedByFriendly: undefined as any };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter display name is required');
      });

      it('should throw error when invitedByFriendly is only whitespace', () => {
        const config = { ...validConfig, invitedByFriendly: '   ' };
        const useCase = new CreateInviteUseCase(config);
        expect(() => useCase.validate()).toThrow('Inviter display name is required');
      });
    });
  });

  describe('execute', () => {
    it('should call validation before executing', async () => {
      const invalidConfig = { ...validConfig, email: 'invalid-email' };
      const useCase = new CreateInviteUseCase(invalidConfig);

      await expect(useCase.execute()).rejects.toThrow('Please enter a valid email address');
      
      // Should not call service if validation fails
      expect(mockSendInvite).not.toHaveBeenCalled();
    });

    it('should call inviteService.sendInvite with correct parameters', async () => {
      const useCase = new CreateInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockSendInvite).toHaveBeenCalledWith({
        email: 'test@example.com',
        permissionLevel: 'editor',
        transcriptionId: 'transcription-123',
        transcriptionTitle: 'Test Transcription',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe'
      });
    });

    it('should return the result from inviteService.sendInvite', async () => {
      const expectedResult: CreateInviteResult = {
        messageId: 'test-message-456',
        inviteId: 'invite-456'
      };

      mockSendInvite.mockResolvedValue(expectedResult);

      const useCase = new CreateInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Network error');
      mockSendInvite.mockRejectedValue(serviceError);

      const useCase = new CreateInviteUseCase(validConfig);

      await expect(useCase.execute()).rejects.toThrow('Network error');
    });

    it('should work with viewer permission level', async () => {
      const config = { ...validConfig, permissionLevel: 'viewer' as const };
      const useCase = new CreateInviteUseCase(config);
      
      await useCase.execute();

      expect(mockSendInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          permissionLevel: 'viewer'
        })
      );
    });

    it('should work with different user data', async () => {
      const config = {
        ...validConfig,
        email: 'different@example.com',
        transcriptionId: 'different-trans-456',
        transcriptionTitle: 'Different Transcription',
        invitedBy: 'different-user-456',
        invitedByFriendly: 'Jane Smith'
      };

      const useCase = new CreateInviteUseCase(config);
      await useCase.execute();

      expect(mockSendInvite).toHaveBeenCalledWith({
        email: 'different@example.com',
        permissionLevel: 'editor',
        transcriptionId: 'different-trans-456',
        transcriptionTitle: 'Different Transcription',
        invitedBy: 'different-user-456',
        invitedByFriendly: 'Jane Smith'
      });
    });
  });

  describe('Use Case Architecture Compliance', () => {
    it('should be stateless - multiple instances should not interfere', async () => {
      mockSendInvite
        .mockResolvedValueOnce({ messageId: 'message-1', inviteId: 'invite-1' })
        .mockResolvedValueOnce({ messageId: 'message-2', inviteId: 'invite-2' });

      const config1 = {
        ...validConfig,
        email: 'user1@example.com',
        transcriptionTitle: 'Transcription 1'
      };

      const config2 = {
        ...validConfig,
        email: 'user2@example.com',
        transcriptionTitle: 'Transcription 2'
      };

      const useCase1 = new CreateInviteUseCase(config1);
      const useCase2 = new CreateInviteUseCase(config2);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.messageId).toBe('message-1');
      expect(result1.inviteId).toBe('invite-1');
      expect(result2.messageId).toBe('message-2');
      expect(result2.inviteId).toBe('invite-2');
    });

    it('should not mutate input configuration', async () => {
      const originalEmail = 'original@example.com';
      const originalTitle = 'Original Title';
      
      const config = {
        ...validConfig,
        email: originalEmail,
        transcriptionTitle: originalTitle
      };

      const useCase = new CreateInviteUseCase(config);
      await useCase.execute();

      expect(config.email).toBe(originalEmail);
      expect(config.transcriptionTitle).toBe(originalTitle);
      expect(config.permissionLevel).toBe('editor');
    });

    it('should handle concurrent executions correctly', async () => {
      const useCase = new CreateInviteUseCase(validConfig);

      // Simulate concurrent calls
      const promise1 = useCase.execute();
      const promise2 = useCase.execute();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.messageId).toBe('test-message-123');
      expect(result2.messageId).toBe('test-message-123');
      expect(mockSendInvite).toHaveBeenCalledTimes(2);
    });
  });

  describe('error message quality', () => {
    it('should provide specific error messages for different validation failures', () => {
      const testCases = [
        { field: 'email', value: '', expectedError: 'Email is required' },
        { field: 'email', value: 'invalid', expectedError: 'Please enter a valid email address' },
        { field: 'permissionLevel', value: undefined, expectedError: 'Permission level is required' },
        { field: 'permissionLevel', value: 'admin', expectedError: 'Permission level must be either "viewer" or "editor"' },
        { field: 'transcriptionId', value: '', expectedError: 'Transcription ID is required' },
        { field: 'transcriptionTitle', value: '', expectedError: 'Transcription title is required' },
        { field: 'invitedBy', value: '', expectedError: 'Inviter ID is required' },
        { field: 'invitedByFriendly', value: '', expectedError: 'Inviter display name is required' }
      ];

      testCases.forEach(({ field, value, expectedError }) => {
        const config = { ...validConfig, [field]: value };
        const useCase = new CreateInviteUseCase(config);
        
        expect(() => useCase.validate()).toThrow(expectedError);
      });
    });
  });
}); 