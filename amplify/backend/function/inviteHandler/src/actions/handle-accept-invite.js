const { AcceptInviteUseCase } = require('./use-cases/accept-invite');

/**
 * Handle accept invite request
 * @param {Object} requestBody - The request body containing inviteId, userEmail, and userId
 * @returns {Object} Success response with invite details
 */
async function handleAcceptInvite(requestBody) {
  console.log('🔄 Processing accept invite request:', { 
    inviteId: requestBody.inviteId, 
    userEmail: requestBody.userEmail,
    userId: requestBody.userId 
  });

  // Create and execute the use case
  const acceptInviteUseCase = new AcceptInviteUseCase({
    inviteId: requestBody.inviteId,
    userEmail: requestBody.userEmail,
    userId: requestBody.userId
  });

  const result = await acceptInviteUseCase.execute();

  console.log('✅ Invite accepted successfully:', result);

  return {
    message: 'Invitation accepted successfully',
    invite: result
  };
}

module.exports = { handleAcceptInvite }; 