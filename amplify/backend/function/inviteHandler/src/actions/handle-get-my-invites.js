const inviteService = require('./services/invite-service');
const transcriptionService = require('./services/transcription-service');

/**
 * Handle get my invites request
 * Returns all invites for a user's email, with optional filtering and transcription data
 * 
 * @param {Object} requestBody - The request body
 * @param {string} requestBody.userEmail - The user's email
 * @param {boolean} [requestBody.includeTranscriptionData] - Include full transcription data for card rendering
 * @param {string} [requestBody.sinceTimestamp] - Optional: only return invites created since this timestamp (for incremental sync)
 * @param {string} [requestBody.transcriptionId] - Optional: filter by transcription ID
 * @param {string} [requestBody.inviteId] - Optional: filter by specific invite ID
 * @returns {Object} Success response with invite details, validation info, and optional transcription data
 */
async function handleGetMyInvites(requestBody) {
  console.log('🔄 Processing get my invites request:', {
    userEmail: requestBody.userEmail,
    includeTranscriptionData: requestBody.includeTranscriptionData,
    sinceTimestamp: requestBody.sinceTimestamp,
    transcriptionId: requestBody.transcriptionId,
    inviteId: requestBody.inviteId
  });

  const { userEmail, includeTranscriptionData, sinceTimestamp, transcriptionId, inviteId } = requestBody;

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
    // Get invites for the user's email - use timestamp-based query if provided for incremental sync
    let allInvites;
    if (sinceTimestamp) {
      console.log(`🔄 Incremental invite sync: loading invites since ${sinceTimestamp}`);
      allInvites = await inviteService.getInvitesByEmailSince(userEmail, sinceTimestamp);
    } else {
      console.log(`🔄 Full invite sync: loading all invites`);
      allInvites = await inviteService.getInvitesByEmail(userEmail);
    }
    
    let filteredInvites = allInvites;

    // Filter by transcription ID if provided
    if (transcriptionId) {
      filteredInvites = filteredInvites.filter(invite => invite.transcriptionId === transcriptionId);
    }

    // Filter by specific invite ID if provided
    if (inviteId) {
      filteredInvites = filteredInvites.filter(invite => invite.id === inviteId);
    }

    // Batch get transcription data if requested and we have invites
    let transcriptionDataMap = {};
    if (includeTranscriptionData && filteredInvites.length > 0) {
      const transcriptionIds = [...new Set(filteredInvites.map(invite => invite.transcriptionId))];
      console.log(`📊 Batch loading ${transcriptionIds.length} unique transcriptions for ${filteredInvites.length} invites...`);
      
      try {
        transcriptionDataMap = await transcriptionService.getTranscriptionsByIds(transcriptionIds);
        console.log(`✅ Successfully loaded ${Object.keys(transcriptionDataMap).length} transcriptions`);
      } catch (error) {
        console.error('❌ Failed to batch load transcription data:', error);
        // Continue without transcription data rather than failing the whole request
        console.warn('⚠️ Continuing without transcription data due to batch load failure');
      }
    }

    // Process each invite to add validation status and optional transcription data
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

      const result = {
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

      // Add transcription data if requested and available
      if (includeTranscriptionData) {
        const transcriptionData = transcriptionDataMap[invite.transcriptionId];
        if (transcriptionData) {
          result.transcription = {
            id: transcriptionData.id,
            title: transcriptionData.title,
            author: transcriptionData.author,
            authorFriendly: transcriptionData.authorFriendly,
            type: transcriptionData.type,
            length: transcriptionData.length,
            coverage: transcriptionData.coverage,
            issueCount: transcriptionData.issueCount,
            regionCount: transcriptionData.regionCount,
            commentCount: transcriptionData.commentCount,
            isPrivate: transcriptionData.isPrivate,
            dateLastUpdated: transcriptionData.dateLastUpdated,
            userLastUpdated: transcriptionData.userLastUpdated,
            createdAt: transcriptionData.createdAt,
            updatedAt: transcriptionData.updatedAt
          };
        } else {
          console.warn(`⚠️ Transcription data not found for invite ${invite.id} -> ${invite.transcriptionId}`);
          result.transcription = null;
        }
      }

      return result;
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
      includeTranscriptionData,
      transcriptionId,
      inviteId,
      total: processedInvites.length,
      transcriptionsLoaded: includeTranscriptionData ? Object.keys(transcriptionDataMap).length : 'N/A'
    });

    return response;
  } catch (error) {
    console.error('❌ Error retrieving user invites:', error);
    throw error;
  }
}

module.exports = { handleGetMyInvites }; 