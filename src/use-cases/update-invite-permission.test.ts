import { UpdateInvitePermissionUseCase } from './update-invite-permission';

jest.mock('../services');

describe('UpdateInvitePermissionUseCase', () => {
  const mockUpdateInvitePermission = jest.fn();

  const mockServices = {
    inviteService: {
      updateInvitePermission: mockUpdateInvitePermission,
    },
  };

  let validConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      permissionLevel: 'editor' as const,
      services: mockServices as any,
    };

    mockUpdateInvitePermission.mockResolvedValue({
      message: 'Permission updated successfully',
      inviteId: 'invite-123',
      permissionLevel: 'editor',
    });
  });

  describe('validation', () => {
    it('should throw when inviteId is empty', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, inviteId: '' });
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw when requestorUserId is empty', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, requestorUserId: '' });
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw for an invalid permissionLevel', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'admin' as any });
      await expect(useCase.execute()).rejects.toThrow('Permission level must be');
    });

    it('should throw when services is missing', async () => {
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, services: undefined });
      await expect(useCase.execute()).rejects.toThrow('Invite service is required');
    });
  });

  describe('execute', () => {
    it('should call updateInvitePermission with correct arguments', async () => {
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      await useCase.execute();
      expect(mockUpdateInvitePermission).toHaveBeenCalledWith('invite-123', 'user-456', 'editor');
    });

    it('should return the result from the service', async () => {
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      const result = await useCase.execute();
      expect(result.permissionLevel).toBe('editor');
    });

    it('should work for viewer level', async () => {
      mockUpdateInvitePermission.mockResolvedValue({
        message: 'Permission updated successfully',
        inviteId: 'invite-123',
        permissionLevel: 'viewer',
      });
      const useCase = new UpdateInvitePermissionUseCase({ ...validConfig, permissionLevel: 'viewer' });
      const result = await useCase.execute();
      expect(result.permissionLevel).toBe('viewer');
    });

    it('should propagate service errors', async () => {
      mockUpdateInvitePermission.mockRejectedValue(new Error('Unauthorized'));
      const useCase = new UpdateInvitePermissionUseCase(validConfig);
      await expect(useCase.execute()).rejects.toThrow('Unauthorized');
    });
  });
});
