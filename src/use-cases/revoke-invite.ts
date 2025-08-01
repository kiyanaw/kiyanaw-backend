import { services } from '../services';

/**
 * Configuration for revoking an invitation
 */
export interface RevokeInviteConfig {
  inviteId: string;
  requestorUserId: string;
  services: typeof services;
}

/**
 * Result of revoking an invitation
 */
export interface RevokeInviteResult {
  message: string;
  inviteId: string;
  email: string;
  transcriptionId: string;
  wasAccepted: boolean;
  permissionLevel: 'viewer' | 'editor';
}

/**
 * Use case for revoking (deleting) an invitation
 * 
 * This will:
 * - Delete the invitation record
 * - Remove the user from transcription ACLs (if the invite was accepted)
 * - Only allow the original inviter to revoke invitations
 */
export class RevokeInviteUseCase {
  constructor(private config: RevokeInviteConfig) {}

  /**
   * Validates the configuration
   */
  private validate(): void {
    const { inviteId, requestorUserId, services } = this.config;

    if (!inviteId || typeof inviteId !== 'string' || inviteId.trim() === '') {
      throw new Error('Invite ID is required');
    }

    if (!requestorUserId || typeof requestorUserId !== 'string' || requestorUserId.trim() === '') {
      throw new Error('Requestor user ID is required');
    }

    if (!services) {
      throw new Error('Services are required');
    }

    if (!services.inviteService) {
      throw new Error('Invite service is required');
    }

    if (typeof services.inviteService.revokeInvite !== 'function') {
      throw new Error('Revoke invite function is required');
    }
  }

  /**
   * Executes the revoke invitation process
   */
  async execute(): Promise<RevokeInviteResult> {
    try {
      this.validate();

      const { inviteId, requestorUserId, services } = this.config;

      console.log(`🔄 Revoking invite ${inviteId} requested by ${requestorUserId}`);

      // Call the backend to revoke the invitation
      const result = await services.inviteService.revokeInvite(inviteId, requestorUserId);

      console.log(`✅ Invite ${inviteId} revoked successfully`);

      return result;
    } catch (error) {
      console.error('❌ Revoke invite use case failed:', error);
      throw error;
    }
  }
} 