const inviteService = require('../services/invite-service');
const { NotFoundError, ValidationError } = require('../errors/invite-errors');

/**
 * Accept Invite Use Case
 * 
 * Handles accepting an invitation by validating the invite and updating its status,
 * plus adding the user to the transcription's viewers or editors list
 */
class AcceptInviteUseCase {
  constructor(config) {
    this.config = config;
  }

  /**
   * Validate the configuration
   */
  validate() {
    const { inviteId, userEmail, userId } = this.config;

    if (!inviteId || typeof inviteId !== 'string' || !inviteId.trim()) {
      throw new Error('Missing required parameter: inviteId');
    }

    if (!userEmail || typeof userEmail !== 'string' || !userEmail.trim()) {
      throw new Error('Missing required parameter: userEmail');
    }

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Missing required parameter: userId');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Find an invite by ID
   * @param {string} inviteId - The invite ID to find
   * @returns {Object|null} The invite record or null if not found
   */
  async findInviteById(inviteId) {
    // For this implementation, we'll query by email and filter by ID
    // since we don't have a direct getById method in the current service
    try {
      const { userEmail } = this.config;
      const invites = await inviteService.getInvitesByEmail(userEmail);
      return invites.find(invite => invite.id === inviteId) || null;
    } catch (error) {
      console.error('Error finding invite:', error);
      return null;
    }
  }

  /**
   * Update invite status to accepted
   * @param {Object} invite - The invite to update
   * @returns {Object} Updated invite record
   */
  async updateInviteStatus(invite) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

    const client = new DynamoDBClient({ region: process.env.REGION });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.API_KIYANAW_INVITETABLE_NAME;

    if (!tableName) {
      throw new Error('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    const { userId } = this.config;
    const now = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        id: invite.id
      },
      UpdateExpression: 'SET #status = :status, #acceptedAt = :acceptedAt, #acceptedByUserId = :acceptedByUserId, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#acceptedAt': 'acceptedAt',
        '#acceptedByUserId': 'acceptedByUserId',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'accepted',
        ':acceptedAt': now,
        ':acceptedByUserId': userId,
        ':updatedAt': now
      },
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  /**
   * Add user to transcription's viewers or editors list
   * @param {string} transcriptionId - The transcription ID
   * @param {string} userId - The user ID to add
   * @param {string} permissionLevel - "viewer" or "editor"
   * @returns {Object} Updated transcription record
   */
  async addUserToTranscription(transcriptionId, userId, permissionLevel) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

    const client = new DynamoDBClient({ region: process.env.REGION });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

    if (!tableName) {
      throw new Error('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
    }

    const now = new Date().toISOString();
    
    // Determine which list to update based on permission level
    const listAttribute = permissionLevel === 'editor' ? 'editors' : 'viewers';
    
    // First try to get the current transcription to check if user is already in the list
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        id: transcriptionId
      }
    });

    try {
      const getResult = await docClient.send(getCommand);
      const transcription = getResult.Item;
      
      if (!transcription) {
        throw new Error(`Transcription ${transcriptionId} not found`);
      }

      // Check if user is already in the appropriate list
      const currentList = transcription[listAttribute] || [];
      if (currentList.includes(userId)) {
        console.log(`User ${userId} is already in transcription ${transcriptionId} ${listAttribute} list`);
        return transcription; // Return the existing transcription
      }

      // User is not in the list, so add them
      const command = new UpdateCommand({
        TableName: tableName,
        Key: {
          id: transcriptionId
        },
        UpdateExpression: `SET #list = list_append(if_not_exists(#list, :empty_list), :user_id), #updatedAt = :updatedAt`,
        ExpressionAttributeNames: {
          '#list': listAttribute,
          '#updatedAt': 'dateLastUpdated'
        },
        ExpressionAttributeValues: {
          ':user_id': [userId],
          ':empty_list': [],
          ':updatedAt': now
        },
        ReturnValues: 'ALL_NEW'
      });

      const result = await docClient.send(command);
      console.log(`User ${userId} added to transcription ${transcriptionId} as ${permissionLevel}`);
      return result.Attributes;
    } catch (error) {
      console.error(`Error adding user ${userId} to transcription ${transcriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute the invite acceptance process
   * @returns {Object} Result with invite details and transcription info
   */
  async execute() {
    this.validate();

    const { inviteId, userEmail, userId } = this.config;

    // Find the invite
    const invite = await this.findInviteById(inviteId);

    if (!invite) {
      throw new NotFoundError('Invite not found or you do not have permission to access it');
    }

    // Validate invite email matches user email
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ValidationError('This invite is not for your email address');
    }

    // Check if invite is still pending
    if (invite.status !== 'pending') {
      if (invite.status === 'accepted') {
        throw new ValidationError('This invitation has already been accepted');
      } else if (invite.status === 'expired') {
        throw new ValidationError('This invitation has expired');
      } else {
        throw new ValidationError('This invitation is no longer valid');
      }
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);
    if (now > expiresAt) {
      throw new ValidationError('This invitation has expired');
    }

    // Update invite status to accepted
    const updatedInvite = await this.updateInviteStatus(invite);

    // Add user to transcription's viewers or editors list
    await this.addUserToTranscription(invite.transcriptionId, userId, invite.permissionLevel);

    console.log(`Invite accepted successfully: ${inviteId} for ${userEmail}, added as ${invite.permissionLevel} to transcription ${invite.transcriptionId}`);

    // Return the updated invite with success message
    return {
      inviteId: updatedInvite.id,
      email: updatedInvite.email,
      permissionLevel: updatedInvite.permissionLevel,
      transcriptionId: updatedInvite.transcriptionId,
      invitedBy: updatedInvite.invitedBy,
      invitedByFriendly: updatedInvite.invitedByFriendly,
      acceptedAt: updatedInvite.acceptedAt,
      status: updatedInvite.status
    };
  }
}

module.exports = { AcceptInviteUseCase }; 