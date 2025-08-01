const inviteService = require('./services/invite-service');

/**
 * Handle get my invites request
 * Returns all invites for a user's email, with optional filtering
 * 
 * @param {Object} requestBody - The request body
 * @param {string} requestBody.userEmail - The user's email
 * @param {string} [requestBody.transcriptionId] - Optional: filter by transcription ID
 * @param {string} [requestBody.inviteId] - Optional: filter by specific invite ID
 * @returns {Object} Success response with invite details and validation info
 */
async function handleGetMyInvites(requestBody) {
  console.log('🔄 Processing get my invites request:', {
    userEmail: requestBody.userEmail,
    transcriptionId: requestBody.transcriptionId,
    inviteId: requestBody.inviteId
  });

  const { userEmail, transcriptionId, inviteId } = requestBody;

  // Validate required parameters
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.trim()) {
    throw new Error('Missing required parameter: userEmail');
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    throw new Error('Invalid email format');
  }

  try {
    // Get all invites for the user's email
    const allInvites = await inviteService.getInvitesByEmail(userEmail);
    
    let filteredInvites = allInvites;

    // Filter by transcription ID if provided
    if (transcriptionId) {
      filteredInvites = filteredInvites.filter(invite => invite.transcriptionId === transcriptionId);
    }

    // Filter by specific invite ID if provided
    if (inviteId) {
      filteredInvites = filteredInvites.filter(invite => invite.id === inviteId);
    }

    // Process each invite to add validation status
    const processedInvites = filteredInvites.map(invite => {
      // Validate invite email matches user email (case insensitive)
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        console.warn(`⚠️ Invite ${invite.id} email mismatch - skipping`);
        return null;
      }

      // Check if invite has expired
      const now = new Date();
      const expiresAt = new Date(invite.expiresAt);
      const isExpired = now > expiresAt;

      return {
        invite: {
          id: invite.id,
          email: invite.email,
          status: invite.status,
          permissionLevel: invite.permissionLevel,
          expiresAt: invite.expiresAt,
          invitedBy: invite.invitedBy,
          invitedByFriendly: invite.invitedByFriendly,
          createdAt: invite.createdAt,
          acceptedAt: invite.acceptedAt,
          transcriptionId: invite.transcriptionId,
          transcriptionTitle: invite.transcriptionTitle,
          updatedAt: invite.updatedAt
        },
        validation: {
          isValid: !isExpired && invite.status === 'pending',
          isExpired,
          isPending: invite.status === 'pending',
          isAccepted: invite.status === 'accepted',
          canAccept: !isExpired && invite.status === 'pending'
        }
      };
    }).filter(item => item !== null); // Remove any null entries

    // If looking for a specific invite and not found, throw error
    if (inviteId && processedInvites.length === 0) {
      throw new Error('Invite not found or you do not have permission to access it');
    }

    const response = {
      invites: processedInvites,
      total: processedInvites.length,
      filters: {
        userEmail,
        transcriptionId: transcriptionId || null,
        inviteId: inviteId || null
      }
    };

    console.log(`✅ Retrieved ${processedInvites.length} invites for user:`, {
      userEmail,
      transcriptionId,
      inviteId,
      total: processedInvites.length
    });

    return response;
  } catch (error) {
    console.error('❌ Error retrieving user invites:', error);
    throw error;
  }
}

module.exports = { handleGetMyInvites }; 