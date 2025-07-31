const { handleInviteServiceError } = require('./services/invite-service');

/**
 * Handles revoking (deleting) an invitation
 * This will:
 * 1. Delete the invitation record
 * 2. Remove the user from the transcription's editors/viewers list (if accepted)
 * 
 * @param {Object} requestBody - The request body
 * @param {string} requestBody.inviteId - The ID of the invite to revoke
 * @param {string} requestBody.requestorUserId - User ID of person requesting the revocation (must be invite sender)
 * @returns {Object} Result object with success status
 */
async function handleRevokeInvite(requestBody) {
  try {
    console.log('🔄 Starting invite revocation process:', requestBody);

    // Validate required parameters
    const { inviteId, requestorUserId } = requestBody;
    
    if (!inviteId || typeof inviteId !== 'string') {
      throw new Error('Missing required parameter: inviteId');
    }
    
    if (!requestorUserId || typeof requestorUserId !== 'string') {
      throw new Error('Missing required parameter: requestorUserId');
    }

    // Initialize services
    console.log('🔍 Loading inviteService...');
    const inviteService = require('./services/invite-service');
    console.log('🔍 Loading RevokeInviteUseCase...');
    const { RevokeInviteUseCase } = require('./use-cases/revoke-invite');
    console.log('🔍 Services loaded successfully');

    // Execute the revoke invite use case
    const revokeInviteUseCase = new RevokeInviteUseCase({
      inviteId,
      requestorUserId,
      inviteService
    });

    const result = await revokeInviteUseCase.execute();

    console.log('✅ Invite revocation completed successfully');
    return {
      message: 'Invitation revoked successfully',
      ...result
    };

  } catch (error) {
    console.error('❌ Revoke invite handler error:', error);
    throw handleInviteServiceError(error, 'revoke invite');
  }
}

module.exports = { handleRevokeInvite }; 