import { RenewInviteUseCase } from './renew-invite';

jest.mock('../services');

describe('RenewInviteUseCase', () => {
  const mockRenewInvite = jest.fn();

  const mockServices = {
    inviteService: {
      renewInvite: mockRenewInvite,
    },
  };

  let validConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      services: mockServices as any,
    };

    mockRenewInvite.mockResolvedValue({
      message: 'Invitation renewed successfully',
      inviteId: 'invite-123',
      email: 'test@example.com',
      transcriptionId: 'transcription-789',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
    });
  });

  describe('validation', () => {
    it('should throw when inviteId is empty', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, inviteId: '' });
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw when requestorUserId is empty', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, requestorUserId: '' });
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw when services is missing', async () => {
      const useCase = new RenewInviteUseCase({ ...validConfig, services: undefined });
      await expect(useCase.execute()).rejects.toThrow('Invite service is required');
    });
  });

  describe('execute', () => {
    it('should call renewInvite with the correct arguments', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      await useCase.execute();
      expect(mockRenewInvite).toHaveBeenCalledWith('invite-123', 'user-456');
    });

    it('should return the result from the service', async () => {
      const useCase = new RenewInviteUseCase(validConfig);
      const result = await useCase.execute();
      expect(result.inviteId).toBe('invite-123');
      expect(result.status).toBe('pending');
    });

    it('should propagate service errors', async () => {
      mockRenewInvite.mockRejectedValue(new Error('Unauthorized'));
      const useCase = new RenewInviteUseCase(validConfig);
      await expect(useCase.execute()).rejects.toThrow('Unauthorized');
    });
  });
});
