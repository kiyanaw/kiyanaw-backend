import { services } from '../services';

export interface CreateInviteConfig {
  email: string;
  permissionLevel: 'viewer' | 'editor';
  transcriptionId: string;
  transcriptionTitle: string;
  invitedBy: string;
  invitedByFriendly: string;
  services: typeof services;
}

export interface CreateInviteResult {
  messageId: string;
  inviteId: string;
}

export class CreateInviteUseCase {
  private config: CreateInviteConfig;

  constructor(config: CreateInviteConfig) {
    this.config = config;
  }

  validate() {
    if (!this.config.email?.trim()) {
      throw new Error('Email is required');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.config.email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!this.config.permissionLevel) {
      throw new Error('Permission level is required');
    }
    
    if (!['viewer', 'editor'].includes(this.config.permissionLevel)) {
      throw new Error('Permission level must be either "viewer" or "editor"');
    }
    
    if (!this.config.transcriptionId?.trim()) {
      throw new Error('Transcription ID is required');
    }
    
    if (!this.config.transcriptionTitle?.trim()) {
      throw new Error('Transcription title is required');
    }
    
    if (!this.config.invitedBy?.trim()) {
      throw new Error('Inviter ID is required');
    }
    
    if (!this.config.invitedByFriendly?.trim()) {
      throw new Error('Inviter display name is required');
    }
  }

  async execute(): Promise<CreateInviteResult> {
    this.validate();

    const { email, permissionLevel, transcriptionId, transcriptionTitle, invitedBy, invitedByFriendly, services } = this.config;
    
    console.log('Sending invite for:', { email, permissionLevel, transcriptionId });

    const result = await services.inviteService.sendInvite({
      email,
      permissionLevel,
      transcriptionId,
      transcriptionTitle,
      invitedBy,
      invitedByFriendly,
    });

    return result;
  }
} 