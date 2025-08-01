import type { services as ServicesType } from '../services';
import { useInviteStore } from '../stores/useInviteStore';

export interface AcceptInviteConfig {
  inviteId: string;
  userEmail: string;
  userId: string;
  services: typeof ServicesType;
}

export interface AcceptInviteResult {
  message: string;
  invite: {
    inviteId: string;
    email: string;
    permissionLevel: 'viewer' | 'editor';
    transcriptionId: string;
    invitedBy: string;
    invitedByFriendly: string;
    acceptedAt: string;
    status: string;
  };
}

/**
 * Accept Invite Use Case
 * 
 * Orchestrates accepting an invitation by calling the backend service
 */
export class AcceptInviteUseCase {
  constructor(private config: AcceptInviteConfig) {}

  /**
   * Validate the configuration
   */
  validate(): void {
    const { inviteId, userEmail, userId } = this.config;

    if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
      throw new Error('Invite ID is required');
    }

    if (!userEmail || typeof userEmail !== 'string' || !userEmail.trim()) {
      throw new Error('User email is required');
    }

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('User ID is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Execute the invite acceptance process
   */
  async execute(): Promise<AcceptInviteResult> {
    this.validate();

    const { inviteId, userEmail, userId, services } = this.config;

    try {
      const result = await services.inviteService.acceptInvite({
        inviteId,
        userEmail,
        userId
      });

      // Update the store to reflect the accepted invite (updates badge count immediately)
      useInviteStore.getState().markInviteAsAccepted(inviteId);

      return result;
    } catch (error) {
      console.error('❌ Accept invite use case failed:', error);
      throw error;
    }
  }
} 