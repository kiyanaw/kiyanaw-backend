import { services } from '../services';

export interface UpdateInvitePermissionConfig {
  inviteId: string;
  requestorUserId: string;
  permissionLevel: 'viewer' | 'editor';
  services: typeof services;
}

export interface UpdateInvitePermissionResult {
  message: string;
  inviteId: string;
  permissionLevel: 'viewer' | 'editor';
}

export class UpdateInvitePermissionUseCase {
  constructor(private config: UpdateInvitePermissionConfig) {}

  private validate(): void {
    if (!this.config.inviteId?.trim()) {
      throw new Error('Invite ID is required');
    }
    if (!this.config.requestorUserId?.trim()) {
      throw new Error('Requestor user ID is required');
    }
    if (!['viewer', 'editor'].includes(this.config.permissionLevel)) {
      throw new Error('Permission level must be "viewer" or "editor"');
    }
    if (!this.config.services?.inviteService) {
      throw new Error('Invite service is required');
    }
  }

  async execute(): Promise<UpdateInvitePermissionResult> {
    this.validate();
    const { inviteId, requestorUserId, permissionLevel, services } = this.config;
    return services.inviteService.updateInvitePermission(inviteId, requestorUserId, permissionLevel);
  }
}
