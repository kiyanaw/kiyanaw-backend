const { RenewInviteUseCase } = require('./renew-invite');

jest.mock('../services/email-service');
jest.mock('../templates/invite-email');

const emailService = require('../services/email-service');
const { generateInviteEmail } = require('../templates/invite-email');

describe('RenewInviteUseCase', () => {
  let validConfig;
  let mockInviteService;
  let mockExpiredInvite;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.REGION = 'us-east-1';
    process.env.ENV = 'staging';

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    mockExpiredInvite = {
      id: 'invite-123',
      email: 'invitee@example.com',
      transcriptionId: 'trans-789',
      transcriptionTitle: 'My Transcription',
      status: 'pending',
      permissionLevel: 'viewer',
      invitedBy: 'user-456',
      invitedByFriendly: 'John Doe',
      expiresAt: pastDate.toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    mockInviteService = {
      getInviteById: jest.fn().mockResolvedValue(mockExpiredInvite),
      updateInviteFields: jest.fn().mockResolvedValue({ ...mockExpiredInvite, status: 'pending' }),
    };

    generateInviteEmail.mockReturnValue({
      subject: 'Test Subject',
      htmlBody: '<p>Test</p>',
      textBody: 'Test',
    });

    emailService.sendEmail.mockResolvedValue({ messageId: 'msg-123' });

    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      baseUrl: 'https://transcribe.kiyanaw.dev',
      inviteService: mockInviteService,
    };
  });

  describe('validation', () => {
    it('should throw when inviteId is missing', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, inviteId: '' });
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw when requestorUserId is missing', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, requestorUserId: '' });
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw when baseUrl is missing', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, baseUrl: '' });
      await expect(useCase.execute()).rejects.toThrow('Base URL is required');
    });
  });

  describe('authorization', () => {
    it('should throw when requestor is not the inviter', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, requestorUserId: 'different-user' });
      await expect(useCase.execute()).rejects.toThrow('Unauthorized');
    });

    it('should throw when invite is not found', async () => {
      mockInviteService.getInviteById.mockResolvedValue(null);
      const useCase = new RenewInviteUseCase(validConfig);
      await expect(useCase.execute()).rejects.toThrow('not found');
    });
  });

  describe('execute', () => {
    it('should bump expiresAt to approximately 7 days from now', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      await useCase.execute();

      const updateCall = mockInviteService.updateInviteFields.mock.calls[0];
      const updatedFields = updateCall[1];
      const newExpiry = new Date(updatedFields.expiresAt);
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      expect(newExpiry.getTime()).toBeGreaterThan(Date.now());
      expect(Math.abs(newExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(5000);
    });

    it('should reset status to pending', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      await useCase.execute();

      const updateCall = mockInviteService.updateInviteFields.mock.calls[0];
      expect(updateCall[1].status).toBe('pending');
    });

    it('should re-send the invite email', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      await useCase.execute();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'invitee@example.com' })
      );
    });

    it('should return the updated invite details', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.inviteId).toBe('invite-123');
      expect(result.email).toBe('invitee@example.com');
    });

    it('should succeed even if re-send email fails', async () => {
      emailService.sendEmail.mockRejectedValue(new Error('SES error'));
      const useCase = new RenewInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.inviteId).toBe('invite-123');
    });
  });
});
