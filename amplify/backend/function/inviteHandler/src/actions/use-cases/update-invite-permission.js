const { addUserToTranscription, removeUserFromTranscription } = require('../services/transcription-acl');

/**
 * Update Invite Permission Use Case
 *
 * Changes the permissionLevel (viewer ↔ editor) on an invite. If the invite has
 * already been accepted, also moves the user between the transcription's
 * viewers/editors lists. Only the original inviter can change the level.
 */
class UpdateInvitePermissionUseCase {
  constructor(config) {
    this.config = config;
  }

  validate() {
    const { inviteId, requestorUserId, permissionLevel } = this.config;

    if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
      throw new Error('Invite ID is required');
    }

    if (!requestorUserId || typeof requestorUserId !== 'string' || !requestorUserId.trim()) {
      throw new Error('Requestor user ID is required');
    }

    if (!permissionLevel || !['viewer', 'editor'].includes(permissionLevel)) {
      throw new Error('Permission level must be "viewer" or "editor"');
    }
  }

  async execute() {
    this.validate();

    const { inviteId, requestorUserId, permissionLevel, inviteService } = this.config;

    const invite = await inviteService.getInviteById(inviteId);
    if (!invite) {
      throw new Error(`Invite ${inviteId} not found`);
    }

    if (invite.invitedBy !== requestorUserId) {
      throw new Error(`Unauthorized: Only the person who sent the invite can change the permission level`);
    }

    if (invite.permissionLevel === permissionLevel) {
      console.log(`Invite ${inviteId} already has permission level ${permissionLevel} - no-op`);
      return { inviteId, permissionLevel, noOp: true };
    }

    const oldLevel = invite.permissionLevel;

    // If already accepted, move the user between transcription ACL lists
    if (invite.status === 'accepted') {
      const userIdentifier = invite.acceptedByUserId || invite.email;
      await removeUserFromTranscription(invite.transcriptionId, userIdentifier, oldLevel);
      await addUserToTranscription(invite.transcriptionId, userIdentifier, permissionLevel);
    }

    const updatedInvite = await inviteService.updateInviteFields(inviteId, { permissionLevel });

    console.log(`Invite ${inviteId} permission updated: ${oldLevel} -> ${permissionLevel}`);

    return {
      inviteId: updatedInvite.id,
      email: updatedInvite.email,
      transcriptionId: updatedInvite.transcriptionId,
      permissionLevel: updatedInvite.permissionLevel,
      wasAccepted: invite.status === 'accepted',
      noOp: false,
    };
  }
}

module.exports = { UpdateInvitePermissionUseCase };
