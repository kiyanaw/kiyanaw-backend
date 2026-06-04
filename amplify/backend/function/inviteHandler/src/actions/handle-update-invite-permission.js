const { handleInviteServiceError } = require('./services/invite-service');

/**
 * Handles changing the permission level on an invitation
 *
 * @param {Object} requestBody
 * @param {string} requestBody.inviteId - The ID of the invite to update
 * @param {string} requestBody.requestorUserId - User ID of the person requesting the change (must be invite sender)
 * @param {string} requestBody.permissionLevel - New permission level ("viewer" or "editor")
 * @returns {Object} Result object with updated invite details
 */
async function handleUpdateInvitePermission(requestBody) {
  try {
    console.log('🔄 Starting invite permission update:', requestBody);

    const { inviteId, requestorUserId, permissionLevel } = requestBody;

    if (!inviteId || typeof inviteId !== 'string') {
      throw new Error('Missing required parameter: inviteId');
    }

    if (!requestorUserId || typeof requestorUserId !== 'string') {
      throw new Error('Missing required parameter: requestorUserId');
    }

    if (!permissionLevel || typeof permissionLevel !== 'string') {
      throw new Error('Missing required parameter: permissionLevel');
    }

    const inviteService = require('./services/invite-service');
    const { UpdateInvitePermissionUseCase } = require('./use-cases/update-invite-permission');

    const useCase = new UpdateInvitePermissionUseCase({
      inviteId,
      requestorUserId,
      permissionLevel,
      inviteService
    });

    const result = await useCase.execute();

    console.log('✅ Invite permission update completed successfully');
    return {
      message: 'Invitation permission updated successfully',
      ...result
    };

  } catch (error) {
    console.error('❌ Update invite permission handler error:', error);
    throw handleInviteServiceError(error, 'update invite permission');
  }
}

module.exports = { handleUpdateInvitePermission };
