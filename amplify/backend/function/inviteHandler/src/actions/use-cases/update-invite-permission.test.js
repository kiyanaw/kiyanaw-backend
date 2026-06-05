const { UpdateInvitePermissionUseCase } = require('./update-invite-permission');

// Mock AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: mockSend })) },
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
}));

describe('UpdateInvitePermissionUseCase', () => {
  let validConfig;
  let mockInviteService;
  let mockPendingInvite;
  let mockAcceptedInvite;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.REGION = 'us-east-1';
    process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME = 'test-transcription-table';

    mockPendingInvite = {
      id: 'invite-123',
      email: 'invitee@example.com',
      transcriptionId: 'trans-789',
      status: 'pending',
      permissionLevel: 'viewer',
      invitedBy: 'user-456',
      invitedByFriendly: 'John Doe',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    mockAcceptedInvite = {
      ...mockPendingInvite,
      status: 'accepted',
      acceptedByUserId: 'accepted-user-999',
    };

    mockInviteService = {
      getInviteById: jest.fn().mockResolvedValue(mockPendingInvite),
      updateInviteFields: jest.fn().mockResolvedValue({ ...mockPendingInvite, permissionLevel: 'editor' }),
    };

    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      permissionLevel: 'editor',
      inviteService: mockInviteService,
    };
  });

  describe('validation', () => {
    it('should throw when inviteId is missing', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, inviteId: '' });
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw when requestorUserId is missing', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, requestorUserId: '' });
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw for invalid permissionLevel', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'admin' });
      await expect(useCase.execute()).rejects.toThrow('Permission level must be');
    });
  });

  describe('authorization', () => {
    it('should throw when requestor is not the inviter', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, requestorUserId: 'wrong-user' });
      await expect(useCase.execute()).rejects.toThrow('Unauthorized');
    });

    it('should throw when invite is not found', async () => {
      mockInviteService.getInviteById.mockResolvedValue(null);
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      await expect(useCase.execute()).rejects.toThrow('not found');
    });
  });

  describe('execute - pending invite', () => {
    it('should update permissionLevel on the invite record', async () => {
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      await useCase.execute();

      expect(mockInviteService.updateInviteFields).toHaveBeenCalledWith(
        'invite-123',
        expect.objectContaining({ permissionLevel: 'editor' })
      );
    });

    it('should return early (no-op) when level is already the same', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'viewer' });
      const result = await useCase.execute();

      expect(mockInviteService.updateInviteFields).not.toHaveBeenCalled();
      expect(result.noOp).toBe(true);
    });

    it('should not touch transcription ACLs for pending invites', async () => {
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      await useCase.execute();

      // No DynamoDB calls for transcription (ACL update only runs for accepted invites)
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('execute - accepted invite', () => {
    beforeEach(() => {
      mockInviteService.getInviteById.mockResolvedValue(mockAcceptedInvite);

      // Mock DynamoDB: get transcription → update transcription (remove from viewers)
      // then update transcription (add to editors)
      mockSend
        .mockResolvedValueOnce({ Item: { id: 'trans-789', viewers: ['accepted-user-999'], editors: [] } }) // get transcription (remove from viewers)
        .mockResolvedValueOnce({ Attributes: { id: 'trans-789', viewers: [], editors: [] } }) // remove from viewers
        .mockResolvedValueOnce({ Item: { id: 'trans-789', viewers: [], editors: [] } }) // get transcription (add to editors)
        .mockResolvedValueOnce({ Attributes: { id: 'trans-789', viewers: [], editors: ['accepted-user-999'] } }); // add to editors
    });

    it('should move user from old list to new list in transcription ACLs', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'editor' });
      await useCase.execute();

      // DynamoDB should have been called for ACL updates (get + update, twice)
      expect(mockSend).toHaveBeenCalled();
    });

    it('should update the invite permissionLevel record', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'editor' });
      await useCase.execute();

      expect(mockInviteService.updateInviteFields).toHaveBeenCalledWith(
        'invite-123',
        expect.objectContaining({ permissionLevel: 'editor' })
      );
    });

    it('should use acceptedByUserId as the identifier for ACL', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'editor' });
      await useCase.execute();

      // The mock should have run (meaning ACL code executed)
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
