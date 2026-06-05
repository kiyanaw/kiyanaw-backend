const emailService = require('../services/email-service');
const { generateInviteEmail } = require('../templates/invite-email');

/**
 * Renew Invite Use Case
 *
 * Resets an expired (or pending) invite's expiry to now+7 days, sets status back to
 * 'pending', and re-sends the invite email. Only the original inviter can renew.
 */
class RenewInviteUseCase {
  constructor(config) {
    this.config = config;
  }

  validate() {
    const { inviteId, requestorUserId, baseUrl } = this.config;

    if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
      throw new Error('Invite ID is required');
    }

    if (!requestorUserId || typeof requestorUserId !== 'string' || !requestorUserId.trim()) {
      throw new Error('Requestor user ID is required');
    }

    if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) {
      throw new Error('Base URL is required');
    }
  }

  async execute() {
    this.validate();

    const { inviteId, requestorUserId, baseUrl, inviteService } = this.config;

    const invite = await inviteService.getInviteById(inviteId);
    if (!invite) {
      throw new Error(`Invite ${inviteId} not found`);
    }

    if (invite.invitedBy !== requestorUserId) {
      throw new Error(`Unauthorized: Only the person who sent the invite can renew it`);
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updatedInvite = await inviteService.updateInviteFields(inviteId, {
      expiresAt: newExpiresAt,
      status: 'pending',
    });

    const inviteLink = `${baseUrl}/invitations/${inviteId}`;
    const expiryDate = new Date(newExpiresAt).toLocaleDateString();

    const emailContent = generateInviteEmail({
      invitedBy: invite.invitedByFriendly,
      transcriptionTitle: invite.transcriptionTitle,
      permissionLevel: invite.permissionLevel,
      inviteLink,
      expiryDate,
    });

    try {
      await emailService.sendEmail({
        to: invite.email,
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        textBody: emailContent.textBody,
      });
    } catch (emailError) {
      console.error(`Failed to re-send invite email (invite still renewed):`, emailError);
    }

    console.log(`Invite ${inviteId} renewed successfully, new expiry: ${newExpiresAt}`);

    return {
      inviteId: updatedInvite.id,
      email: updatedInvite.email,
      transcriptionId: updatedInvite.transcriptionId,
      expiresAt: updatedInvite.expiresAt,
      status: updatedInvite.status,
    };
  }
}

module.exports = { RenewInviteUseCase };
