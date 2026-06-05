import { services } from '../services';

export interface RenewInviteConfig {
  inviteId: string;
  requestorUserId: string;
  services: typeof services;
}

export interface RenewInviteResult {
  message: string;
  inviteId: string;
  email: string;
  transcriptionId: string;
  expiresAt: string;
  status: string;
}

export class RenewInviteUseCase {
  constructor(private config: RenewInviteConfig) {}

  private validate(): void {
    if (!this.config.inviteId?.trim()) {
      throw new Error('Invite ID is required');
    }
    if (!this.config.requestorUserId?.trim()) {
      throw new Error('Requestor user ID is required');
    }
    if (!this.config.services?.inviteService) {
      throw new Error('Invite service is required');
    }
  }

  async execute(): Promise<RenewInviteResult> {
    this.validate();
    const { inviteId, requestorUserId, services } = this.config;
    return services.inviteService.renewInvite(inviteId, requestorUserId);
  }
}
