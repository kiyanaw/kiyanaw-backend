const emailService = require('../services/email-service');
const inviteService = require('../services/invite-service');
const { generateInviteEmail } = require('../templates/invite-email');

/**
 * Send Invite Use Case
 * 
 * Orchestrates the process of sending invitation emails
 */
class SendInviteUseCase {
  constructor(config) {
    this.config = config;
  }

  /**
   * Validate input parameters
   */
  validate() {
    const { 
      email, 
      transcriptionId, 
      transcriptionTitle, 
      permissionLevel, 
      invitedBy,
      invitedByFriendly,
      baseUrl 
    } = this.config;

    if (!email || typeof email !== 'string') {
      throw new Error('Valid email address is required');
    }

    if (!transcriptionId || typeof transcriptionId !== 'string') {
      throw new Error('Transcription ID is required');
    }

    if (!transcriptionTitle || typeof transcriptionTitle !== 'string') {
      throw new Error('Transcription title is required');
    }

    if (!permissionLevel || !['viewer', 'editor'].includes(permissionLevel)) {
      throw new Error('Permission level must be either "viewer" or "editor"');
    }

    if (!invitedBy || typeof invitedBy !== 'string') {
      throw new Error('InvitedBy (user ID) is required');
    }

    if (!invitedByFriendly || typeof invitedByFriendly !== 'string') {
      throw new Error('InvitedByFriendly (user display name) is required');
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('Base URL is required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Generate a unique invite ID
   * TODO: Replace with proper UUID library or database-generated ID
   */
  generateInviteId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `invite_${timestamp}_${randomPart}`;
  }

  /**
   * Execute the invite sending process
   * @returns {Object} Result with messageId, email, inviteId
   */
  async execute() {
    this.validate();

    const { 
      email, 
      transcriptionId,
      transcriptionTitle, 
      permissionLevel, 
      invitedBy,
      invitedByFriendly,
      baseUrl 
    } = this.config;

    // Check for existing invites to prevent duplicates
    const existingInvites = await inviteService.getInvitesByEmail(email);
    const existingInvite = existingInvites.find(invite => 
      invite.transcriptionId === transcriptionId && 
      invite.status === 'pending'
    );
    
    if (existingInvite) {
      throw new Error('Invite already exists for this email and transcription');
    }

    // Generate business logic values
    const inviteId = this.generateInviteId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const createdAt = now.toISOString();
    
    // Create invite record in database
    const inviteRecord = await inviteService.createInvite({
      id: inviteId,
      email,
      transcriptionId,
      transcriptionTitle,
      permissionLevel,
      expiresAt: expiresAt.toISOString(),
      invitedBy,
      invitedByFriendly,
      createdAt
    });

    // Generate invite acceptance link using the created invite ID
    const inviteLink = `${baseUrl}/invitations/${inviteRecord.id}`;

    // Format expiry date for display
    const expiryDate = expiresAt.toLocaleDateString();

    // Generate email content from template
    const emailContent = generateInviteEmail({
      invitedBy: invitedByFriendly,
      transcriptionTitle,
      permissionLevel,
      inviteLink,
      expiryDate,
    });

    // Send email via service
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        textBody: emailContent.textBody,
      });

      // Return success data
      return {
        messageId: result.messageId,
        email: email,
        inviteId: inviteRecord.id,
        inviteRecord: inviteRecord,
      };
    } catch (emailError) {
      // If email fails to send, update invite status to 'failed'
      console.error(`Failed to send invite email to ${email}:`, emailError);
      
      try {
        await inviteService.updateInviteStatus(inviteRecord.id, 'failed');
        console.log(`Updated invite ${inviteRecord.id} status to 'failed' after email failure`);
      } catch (updateError) {
        console.error(`Failed to update invite status after email failure:`, updateError);
        // Continue to throw original email error
      }
      
      // Re-throw the original email error
      throw new Error(`Failed to send invitation email: ${emailError.message}`);
    }
  }
}

module.exports = { SendInviteUseCase }; 