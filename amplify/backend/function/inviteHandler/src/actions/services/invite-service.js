const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ValidationError, NotFoundError, InternalError } = require('../errors/invite-errors');

/**
 * Invite Service
 * 
 * Stateless service for managing invites in DynamoDB
 */
class InviteService {
  constructor() {
    // Initialize DynamoDB client
    const client = new DynamoDBClient({ region: process.env.REGION });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.API_KIYANAW_INVITETABLE_NAME;
  }

  /**
   * Create a new invite record
   * @param {Object} inviteData - Invite data to create
   * @param {string} inviteData.id - Unique invite ID
   * @param {string} inviteData.email - Recipient email address
   * @param {string} inviteData.transcriptionId - ID of the transcription
   * @param {string} inviteData.transcriptionTitle - Title of the transcription being shared
   * @param {string} inviteData.permissionLevel - "viewer" or "editor"
   * @param {string} inviteData.invitedBy - User ID who sent the invite
   * @param {string} inviteData.invitedByFriendly - Friendly name of who sent the invite
   * @param {string} inviteData.expiresAt - ISO date string when invite expires
   * @param {string} inviteData.createdAt - ISO date string when invite was created
   * @returns {Object} Created invite record
   */
  async createInvite(inviteData) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    // Prepare the invite record according to GraphQL schema
    const inviteRecord = {
      id: inviteData.id,
      email: inviteData.email.toLowerCase(),
      status: 'pending', // Initial status
      permissionLevel: inviteData.permissionLevel,
      expiresAt: inviteData.expiresAt,
      invitedBy: inviteData.invitedBy,
      invitedByFriendly: inviteData.invitedByFriendly,
      createdAt: inviteData.createdAt,
      transcriptionId: inviteData.transcriptionId,
      transcriptionTitle: inviteData.transcriptionTitle,
      // acceptedAt will be set when invite is accepted
      acceptedAt: null,
      // Add required fields for Amplify
      __typename: 'Invite',
      updatedAt: inviteData.createdAt,
      // Add required DataStore fields
      _version: 0,
      _lastChangedAt: 0,
      _deleted: false
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: inviteRecord
    });

    await this.docClient.send(command);

    console.info(`Invite created successfully: ${inviteData.id} for ${inviteData.email}`);

    return inviteRecord;
  }

  /**
   * Get invites by email address (excluding deleted records)
   * @param {string} email - Email address to search for
   * @returns {Array} Array of active invite records for this email
   */
  async getInvitesByEmail(email) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ByEmail',
      KeyConditionExpression: 'email = :email',
      FilterExpression: 'attribute_not_exists(#deleted) OR #deleted = :false',
      ExpressionAttributeNames: {
        '#deleted': '_deleted'
      },
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
        ':false': false
      }
    });

    const result = await this.docClient.send(command);
    
    const items = result.Items || [];
    console.debug(`Found ${items.length} active invites for email: ${email}`);
    
    return items;
  }

  /**
   * Get invites by email since a specific timestamp using GSI with sort key
   * @param {string} email - Email address to search for
   * @param {string} sinceTimestamp - ISO timestamp to query from (inclusive)
   * @returns {Array} Array of active invite records created since the timestamp
   */
  async getInvitesByEmailSince(email, sinceTimestamp) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    console.debug(`Querying invites for ${email} since ${sinceTimestamp} using ByEmailCreatedAt GSI...`);

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ByEmailCreatedAt',
      KeyConditionExpression: 'email = :email AND createdAt >= :sinceTimestamp',
      FilterExpression: 'attribute_not_exists(#deleted) OR #deleted = :false',
      ExpressionAttributeNames: {
        '#deleted': '_deleted'
      },
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
        ':sinceTimestamp': sinceTimestamp,
        ':false': false
      },
      ScanIndexForward: false // Most recent first
    });

    const result = await this.docClient.send(command);
    
    const items = result.Items || [];
    console.debug(`Found ${items.length} invites for email: ${email} since ${sinceTimestamp}`);
    
    return items;
  }

  /**
   * Get invite by ID
   * @param {string} inviteId - The invite ID to look up
   * @returns {Object|null} The invite record or null if not found
   */
  async getInviteById(inviteId) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        id: inviteId
      }
    });

    try {
      const result = await this.docClient.send(command);
      const invite = result.Item;
      
      // Return null if not found or if soft-deleted
      if (!invite || invite._deleted === true) {
        return null;
      }
      
      console.debug(`Found invite: ${inviteId}`);
      return invite;
    } catch (error) {
      console.error(`Error getting invite ${inviteId}:`, error);
      throw error;
    }
  }

  /**
   * Delete invite by ID (hard delete)
   * @param {string} inviteId - The invite ID to delete
   * @returns {Object} The deleted invite record
   */
  async deleteInvite(inviteId) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        id: inviteId
      },
      ReturnValues: 'ALL_OLD'
    });

    try {
      const result = await this.docClient.send(command);
      const deletedInvite = result.Attributes;
      
      if (!deletedInvite) {
        throw new NotFoundError(`Invite ${inviteId} not found or already deleted`);
      }
      
      console.info(`Invite deleted successfully: ${inviteId}`);
      return deletedInvite;
    } catch (error) {
      console.error(`Error deleting invite ${inviteId}:`, error);
      throw error;
    }
  }

  /**
   * Update invite status
   * @param {string} inviteId - The invite ID to update
   * @param {string} status - New status ('pending', 'accepted', 'failed', 'expired')
   * @returns {Object} Updated invite record
   */
  async updateInviteStatus(inviteId, status) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    // Valid status values
    const validStatuses = ['pending', 'accepted', 'failed', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // First get the current invite to get the version
    const currentInvite = await this.getInviteById(inviteId);
    if (!currentInvite) {
      throw new NotFoundError(`Invite ${inviteId} not found`);
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...currentInvite,
        status: status,
        updatedAt: new Date().toISOString(),
        _version: (currentInvite._version || 0) + 1,
        _lastChangedAt: Date.now()
      }
    });

    await this.docClient.send(command);

    const now = Date.now();
    const updatedInvite = {
      ...currentInvite,
      status: status,
      updatedAt: new Date().toISOString(),
      _version: (currentInvite._version || 0) + 1,
      _lastChangedAt: now
    };

    console.info(`Invite status updated: ${inviteId} -> ${status}`);
    return updatedInvite;
  }

  /**
   * Update arbitrary fields on an invite record
   * @param {string} inviteId - The invite ID to update
   * @param {Object} fields - Fields to merge into the record
   * @returns {Object} Updated invite record
   */
  async updateInviteFields(inviteId, fields) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    const currentInvite = await this.getInviteById(inviteId);
    if (!currentInvite) {
      throw new NotFoundError(`Invite ${inviteId} not found`);
    }

    const updatedInvite = {
      ...currentInvite,
      ...fields,
      updatedAt: new Date().toISOString(),
      _version: (currentInvite._version || 0) + 1,
      _lastChangedAt: Date.now()
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: updatedInvite
    });

    await this.docClient.send(command);

    console.info(`Invite fields updated: ${inviteId}`);
    return updatedInvite;
  }

  /**
   * Get the configured table name
   */
  getTableName() {
    return this.tableName;
  }
}

/**
 * Handles and standardizes invite service errors
 * @param {Error} error - The original error
 * @param {string} operation - Description of the operation that failed
 * @returns {Error} Standardized error with helpful message
 */
function handleInviteServiceError(error, operation) {
  console.error(`Invite service error during ${operation}:`, error);
  
  // If it's already a well-formed error, pass it through
  if (error.message && !error.message.includes('DynamoDB') && !error.message.includes('SDK')) {
    return error;
  }
  
  // Handle common AWS/DynamoDB errors
  if (error.name === 'ResourceNotFoundException') {
    return new Error('Invite not found');
  }
  
  if (error.name === 'ConditionalCheckFailedException') {
    return new Error('Invite has already been processed or does not exist');
  }
  
  if (error.name === 'ValidationException') {
    return new Error('Invalid request data');
  }
  
  // Generic fallback
  return new Error(`Failed to ${operation}. Please try again.`);
}

// Export singleton instance and utility function
module.exports = new InviteService();
module.exports.handleInviteServiceError = handleInviteServiceError;
