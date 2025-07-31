const { SendInviteUseCase } = require('./send-invite');

// Mock dependencies
jest.mock('../services/email-service');
jest.mock('../services/invite-service');
jest.mock('../templates/invite-email');

const emailService = require('../services/email-service');
const inviteService = require('../services/invite-service');
const { generateInviteEmail } = require('../templates/invite-email');

describe('SendInviteUseCase', () => {
  let validConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup valid config
    validConfig = {
      email: 'test@example.com',
      transcriptionId: 'trans-123',
      transcriptionTitle: 'Test Transcription',
      permissionLevel: 'editor',
      invitedBy: 'user-123',
      invitedByFriendly: 'John Doe',
      baseUrl: 'https://app.kiyanaw.dev'
    };

    // Setup default mocks
    generateInviteEmail.mockReturnValue({
      subject: 'Test Subject',
      htmlBody: '<p>Test HTML</p>',
      textBody: 'Test Text'
    });

    emailService.sendEmail.mockResolvedValue({
      messageId: 'test-message-123'
    });

    inviteService.createInvite.mockResolvedValue({
      id: 'invite_123_abc456',
      email: 'test@example.com',
      status: 'pending',
      permissionLevel: 'editor',
      expiresAt: '2025-08-13T00:00:00.000Z',
      invitedBy: 'user-123',
      invitedByFriendly: 'John Doe',
      createdAt: '2025-08-06T00:00:00.000Z',
      transcriptionId: 'trans-123'
    });

    // Default: no existing invites
    inviteService.getInvitesByEmail.mockResolvedValue([]);
  });

  describe('validation', () => {
    it('should validate all required fields are present', () => {
      const useCase = new SendInviteUseCase(validConfig);
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when email is missing', () => {
      const config = { ...validConfig, email: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Valid email address is required');
    });

    it('should throw error when email is empty string', () => {
      const config = { ...validConfig, email: '' };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Valid email address is required');
    });

    it('should throw error when email is not a string', () => {
      const config = { ...validConfig, email: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Valid email address is required');
    });

    it('should throw error when email format is invalid', () => {
      const config = { ...validConfig, email: 'invalid-email' };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Invalid email format');
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        const config = { ...validConfig, email };
        const useCase = new SendInviteUseCase(config);
        expect(() => useCase.validate()).not.toThrow();
      });
    });

    it('should throw error when transcriptionId is missing', () => {
      const config = { ...validConfig, transcriptionId: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Transcription ID is required');
    });

    it('should throw error when transcriptionId is not a string', () => {
      const config = { ...validConfig, transcriptionId: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Transcription ID is required');
    });

    it('should throw error when transcriptionTitle is missing', () => {
      const config = { ...validConfig, transcriptionTitle: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Transcription title is required');
    });

    it('should throw error when transcriptionTitle is not a string', () => {
      const config = { ...validConfig, transcriptionTitle: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Transcription title is required');
    });

    it('should throw error when permissionLevel is missing', () => {
      const config = { ...validConfig, permissionLevel: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Permission level must be either "viewer" or "editor"');
    });

    it('should throw error when permissionLevel is invalid', () => {
      const config = { ...validConfig, permissionLevel: 'admin' };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Permission level must be either "viewer" or "editor"');
    });

    it('should accept valid permission levels', () => {
      ['viewer', 'editor'].forEach(permissionLevel => {
        const config = { ...validConfig, permissionLevel };
        const useCase = new SendInviteUseCase(config);
        expect(() => useCase.validate()).not.toThrow();
      });
    });

    it('should throw error when baseUrl is missing', () => {
      const config = { ...validConfig, baseUrl: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Base URL is required');
    });

    it('should throw error when baseUrl is not a string', () => {
      const config = { ...validConfig, baseUrl: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('Base URL is required');
    });

    it('should throw error when invitedBy is missing', () => {
      const config = { ...validConfig, invitedBy: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('InvitedBy (user ID) is required');
    });

    it('should throw error when invitedBy is not a string', () => {
      const config = { ...validConfig, invitedBy: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('InvitedBy (user ID) is required');
    });

    it('should throw error when invitedByFriendly is missing', () => {
      const config = { ...validConfig, invitedByFriendly: undefined };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('InvitedByFriendly (user display name) is required');
    });

    it('should throw error when invitedByFriendly is not a string', () => {
      const config = { ...validConfig, invitedByFriendly: 123 };
      const useCase = new SendInviteUseCase(config);
      expect(() => useCase.validate()).toThrow('InvitedByFriendly (user display name) is required');
    });
  });

  describe('generateInviteId', () => {
    it('should generate unique IDs', () => {
      const useCase = new SendInviteUseCase(validConfig);
      const id1 = useCase.generateInviteId();
      const id2 = useCase.generateInviteId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^invite_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^invite_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate IDs with correct format', () => {
      const useCase = new SendInviteUseCase(validConfig);
      const inviteId = useCase.generateInviteId();
      
      expect(inviteId).toMatch(/^invite_[a-z0-9]+_[a-z0-9]{6}$/);
      expect(inviteId).toContain('invite_');
    });
  });

  describe('execute', () => {
    it('should orchestrate the complete invite sending workflow', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual({
        messageId: 'test-message-123',
        email: 'test@example.com',
        inviteId: 'invite_123_abc456',
        inviteRecord: expect.objectContaining({
          id: 'invite_123_abc456',
          email: 'test@example.com',
          status: 'pending'
        })
      });
    });

    it('should call validation before executing', async () => {
      const invalidConfig = { ...validConfig, email: 'invalid-email' };
      const useCase = new SendInviteUseCase(invalidConfig);

      await expect(useCase.execute()).rejects.toThrow('Invalid email format');
      
      // Should not call any services if validation fails
      expect(inviteService.createInvite).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(generateInviteEmail).not.toHaveBeenCalled();
    });

    it('should create invite record in database', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      await useCase.execute();

      expect(inviteService.createInvite).toHaveBeenCalledWith({
        id: expect.stringMatching(/^invite_[a-z0-9]+_[a-z0-9]+$/),
        email: 'test@example.com',
        transcriptionId: 'trans-123',
        transcriptionTitle: 'Test Transcription',
        permissionLevel: 'editor',
        expiresAt: expect.any(String), // ISO date string
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: expect.any(String) // ISO date string
      });
    });

    it('should generate invite ID and expiry date', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      await useCase.execute();

      expect(generateInviteEmail).toHaveBeenCalledWith({
        invitedBy: 'John Doe',
        transcriptionTitle: 'Test Transcription',
        permissionLevel: 'editor',
        inviteLink: 'https://app.kiyanaw.dev/invitations/invite_123_abc456',
        expiryDate: expect.any(String)
      });
    });

    it('should call emailService.sendEmail with correct parameters', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      await useCase.execute();

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text'
      });
    });

    it('should generate correct invite link with baseUrl', async () => {
      const config = { ...validConfig, baseUrl: 'https://app.kiyanaw.net' };
      const useCase = new SendInviteUseCase(config);
      await useCase.execute();

      const mockCall = generateInviteEmail.mock.calls[0][0];
      expect(mockCall.inviteLink).toMatch(/^https:\/\/app\.kiyanaw\.net\/invitations\/invite_/);
    });

    it('should format expiry date correctly', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      await useCase.execute();

      const mockCall = generateInviteEmail.mock.calls[0][0];
      // Accept various date formats (MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.)
      expect(mockCall.expiryDate).toMatch(/^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}$/);
      expect(mockCall.expiryDate).toBeTruthy();
      expect(typeof mockCall.expiryDate).toBe('string');
    });

    it('should handle email service errors', async () => {
      const emailError = new Error('SES Error');
      emailService.sendEmail.mockRejectedValue(emailError);
      
      const useCase = new SendInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('SES Error');
    });

    it('should handle template generation errors', async () => {
      const templateError = new Error('Template generation failed');
      generateInviteEmail.mockImplementation(() => {
        throw templateError;
      });
      
      const useCase = new SendInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Template generation failed');
    });

    it('should handle invite service errors', async () => {
      const inviteError = new Error('Database connection failed');
      inviteService.createInvite.mockRejectedValue(inviteError);
      
      const useCase = new SendInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });

    it('should check for existing invites before creating new one', async () => {
      const useCase = new SendInviteUseCase(validConfig);
      await useCase.execute();

      expect(inviteService.getInvitesByEmail).toHaveBeenCalledWith('test@example.com');
      expect(inviteService.getInvitesByEmail).toHaveBeenCalledTimes(1);
    });

    it('should prevent duplicate invites for same email and transcription', async () => {
      // Mock existing pending invite for same email and transcription
      inviteService.getInvitesByEmail.mockResolvedValue([
        {
          id: 'existing-invite-123',
          email: 'test@example.com',
          transcriptionId: 'trans-123',
          status: 'pending',
          permissionLevel: 'viewer'
        }
      ]);

      const useCase = new SendInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Invite already exists for this email and transcription');
      
      // Should not create a new invite or send email
      expect(inviteService.createInvite).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should allow new invite if existing invite is for different transcription', async () => {
      // Mock existing invite for same email but different transcription
      inviteService.getInvitesByEmail.mockResolvedValue([
        {
          id: 'existing-invite-123',
          email: 'test@example.com',
          transcriptionId: 'different-trans-456', // Different transcription
          status: 'pending',
          permissionLevel: 'viewer'
        }
      ]);

      const useCase = new SendInviteUseCase(validConfig);
      const result = await useCase.execute();
      
      // Should proceed normally since it's for a different transcription
      expect(result.inviteId).toBe('invite_123_abc456');
      expect(inviteService.createInvite).toHaveBeenCalled();
    });

    it('should allow new invite if existing invite is expired/accepted', async () => {
      // Mock existing invite for same email and transcription but not pending
      inviteService.getInvitesByEmail.mockResolvedValue([
        {
          id: 'existing-invite-123',
          email: 'test@example.com',
          transcriptionId: 'trans-123',
          status: 'accepted', // Not pending
          permissionLevel: 'viewer'
        }
      ]);

      const useCase = new SendInviteUseCase(validConfig);
      const result = await useCase.execute();
      
      // Should proceed normally since existing invite is not pending
      expect(result.inviteId).toBe('invite_123_abc456');
      expect(inviteService.createInvite).toHaveBeenCalled();
    });

    it('should work with different permission levels', async () => {
      const config = { ...validConfig, permissionLevel: 'viewer' };
      const useCase = new SendInviteUseCase(config);
      await useCase.execute();

      expect(generateInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          permissionLevel: 'viewer'
        })
      );
    });

    it('should work with different base URLs', async () => {
      const config = { ...validConfig, baseUrl: 'https://custom-domain.com' };
      const useCase = new SendInviteUseCase(config);
      await useCase.execute();

      const mockCall = generateInviteEmail.mock.calls[0][0];
      expect(mockCall.inviteLink).toMatch(/^https:\/\/custom-domain\.com\/invitations\/invite_/);
    });
  });

  describe('Use Case Architecture Compliance', () => {
    it('should be stateless - multiple instances should not interfere', async () => {
      emailService.sendEmail
        .mockResolvedValueOnce({ messageId: 'message-1' })
        .mockResolvedValueOnce({ messageId: 'message-2' });

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

      const useCase1 = new SendInviteUseCase(config1);
      const useCase2 = new SendInviteUseCase(config2);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.messageId).toBe('message-1');
      expect(result1.email).toBe('user1@example.com');
      expect(result2.messageId).toBe('message-2');
      expect(result2.email).toBe('user2@example.com');
    });

    it('should not mutate input configuration', async () => {
      const originalEmail = 'original@example.com';
      const originalTitle = 'Original Title';
      
      const config = {
        email: originalEmail,
        transcriptionId: 'trans-123',
        transcriptionTitle: originalTitle,
        permissionLevel: 'editor',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        baseUrl: 'https://app.kiyanaw.dev'
      };

      const useCase = new SendInviteUseCase(config);
      await useCase.execute();

      expect(config.email).toBe(originalEmail);
      expect(config.transcriptionTitle).toBe(originalTitle);
      expect(config.permissionLevel).toBe('editor');
    });

    it('should generate different invite IDs for same configuration', async () => {
      // Mock createInvite to return different IDs
      inviteService.createInvite
        .mockResolvedValueOnce({
          id: 'invite_123_abc456',
          email: 'test@example.com',
          status: 'pending'
        })
        .mockResolvedValueOnce({
          id: 'invite_456_def789',
          email: 'test@example.com', 
          status: 'pending'
        });

      const useCase1 = new SendInviteUseCase(validConfig);
      const useCase2 = new SendInviteUseCase(validConfig);

      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute()
      ]);

      expect(result1.inviteId).not.toBe(result2.inviteId);
      expect(result1.inviteId).toMatch(/^invite_[a-z0-9]+_[a-z0-9]+$/);
      expect(result2.inviteId).toMatch(/^invite_[a-z0-9]+_[a-z0-9]+$/);
    });
  });
});
