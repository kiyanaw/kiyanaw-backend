const { handleInviteServiceError } = require('./services/invite-service');

/**
 * Handles renewing (resetting expiry of) an invitation
 *
 * @param {Object} requestBody
 * @param {string} requestBody.inviteId - The ID of the invite to renew
 * @param {string} requestBody.requestorUserId - User ID of the person requesting the renewal (must be invite sender)
 * @returns {Object} Result object with renewed invite details
 */
async function handleRenewInvite(requestBody) {
  try {
    console.log('🔄 Starting invite renewal process:', requestBody);

    const { inviteId, requestorUserId } = requestBody;

    if (!inviteId || typeof inviteId !== 'string') {
      throw new Error('Missing required parameter: inviteId');
    }

    if (!requestorUserId || typeof requestorUserId !== 'string') {
      throw new Error('Missing required parameter: requestorUserId');
    }

    const inviteService = require('./services/invite-service');
    const { RenewInviteUseCase } = require('./use-cases/renew-invite');

    const baseUrl = process.env.ENV === 'production'
      ? 'https://transcribe.kiyanaw.net'
      : 'https://transcribe.kiyanaw.dev';

    const renewInviteUseCase = new RenewInviteUseCase({
      inviteId,
      requestorUserId,
      baseUrl,
      inviteService
    });

    const result = await renewInviteUseCase.execute();

    console.log('✅ Invite renewal completed successfully');
    return {
      message: 'Invitation renewed successfully',
      ...result
    };

  } catch (error) {
    console.error('❌ Renew invite handler error:', error);
    throw handleInviteServiceError(error, 'renew invite');
  }
}

module.exports = { handleRenewInvite };
