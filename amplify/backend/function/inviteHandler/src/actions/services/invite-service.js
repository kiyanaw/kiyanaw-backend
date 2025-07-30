const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
   * @param {string} inviteData.permissionLevel - "viewer" or "editor"
   * @param {string} inviteData.invitedBy - User ID who sent the invite
   * @param {string} inviteData.invitedByFriendly - Friendly name of who sent the invite
   * @param {string} inviteData.expiresAt - ISO date string when invite expires
   * @param {string} inviteData.createdAt - ISO date string when invite was created
   * @returns {Object} Created invite record
   */
  async createInvite(inviteData) {
    if (!this.tableName) {
      throw new Error('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
    }

    // Prepare the invite record according to GraphQL schema
    const inviteRecord = {
      id: inviteData.id,
      email: inviteData.email,
      status: 'pending', // Initial status
      permissionLevel: inviteData.permissionLevel,
      expiresAt: inviteData.expiresAt,
      invitedBy: inviteData.invitedBy,
      invitedByFriendly: inviteData.invitedByFriendly,
      createdAt: inviteData.createdAt,
      transcriptionId: inviteData.transcriptionId,
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

    console.log(`Invite created successfully: ${inviteData.id} for ${inviteData.email}`);

    return inviteRecord;
  }

  /**
   * Get invites by email address (excluding deleted records)
   * @param {string} email - Email address to search for
   * @returns {Array} Array of active invite records for this email
   */
  async getInvitesByEmail(email) {
    if (!this.tableName) {
      throw new Error('API_KIYANAW_INVITETABLE_NAME environment variable not configured');
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
        ':email': email,
        ':false': false
      }
    });

    const result = await this.docClient.send(command);
    
    const items = result.Items || [];
    console.log(`Found ${items.length} active invites for email: ${email}`);
    
    return items;
  }

  /**
   * Get the configured table name
   */
  getTableName() {
    return this.tableName;
  }
}

// Export singleton instance
module.exports = new InviteService();
