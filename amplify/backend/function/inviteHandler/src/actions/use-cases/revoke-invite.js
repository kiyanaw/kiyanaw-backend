/**
 * Use case for revoking (deleting) an invitation
 * Handles authorization, ACL cleanup, and invitation deletion
 */
class RevokeInviteUseCase {
  constructor(config) {
    this.config = config;
  }

  /**
   * Validates the configuration
   */
  validate() {
    const { inviteId, requestorUserId, inviteService } = this.config;
    
    if (!inviteId || typeof inviteId !== 'string') {
      throw new Error('Invite ID is required');
    }
    
    if (!requestorUserId || typeof requestorUserId !== 'string') {
      throw new Error('Requestor user ID is required');
    }
    
    if (!inviteService) {
      throw new Error('Invite service is required');
    }
  }

  /**
   * Removes user from transcription's editors or viewers list
   * @param {string} transcriptionId - The transcription ID
   * @param {string} userIdentifier - The user ID (preferred) or email to remove
   * @param {string} permissionLevel - "viewer" or "editor"
   */
  async removeUserFromTranscription(transcriptionId, userIdentifier, permissionLevel) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

    const client = new DynamoDBClient({ region: process.env.REGION });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

    if (!tableName) {
      throw new Error('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
    }

    const now = new Date().toISOString();
    const listAttribute = permissionLevel === 'editor' ? 'editors' : 'viewers';

    // First get the current transcription to check the current list
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
        console.log(`⚠️ Transcription ${transcriptionId} not found - skipping ACL cleanup`);
        return;
      }

      // Check if user is in the appropriate list
      const currentList = transcription[listAttribute] || [];
      if (!currentList.includes(userIdentifier)) {
        console.log(`ℹ️ User ${userIdentifier} is not in transcription ${transcriptionId} ${listAttribute} list - nothing to remove`);
        return;
      }

      // Remove user from the list
      const updatedList = currentList.filter(id => id !== userIdentifier);

      // Update the transcription
      const command = new UpdateCommand({
        TableName: tableName,
        Key: {
          id: transcriptionId
        },
        UpdateExpression: `SET #list = :updatedList, #updatedAt = :updatedAt`,
        ExpressionAttributeNames: {
          '#list': listAttribute,
          '#updatedAt': 'dateLastUpdated'
        },
        ExpressionAttributeValues: {
          ':updatedList': updatedList,
          ':updatedAt': now
        },
        ReturnValues: 'ALL_NEW'
      });

      const result = await docClient.send(command);
      console.log(`✅ User ${userIdentifier} removed from transcription ${transcriptionId} ${listAttribute} list`);
      return result.Attributes;
    } catch (error) {
      console.error(`❌ Error removing user ${userIdentifier} from transcription ${transcriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Executes the revoke invitation process
   */
  async execute() {
    this.validate();

    const { inviteId, requestorUserId, inviteService } = this.config;

    console.log(`🔄 Revoking invite ${inviteId} requested by ${requestorUserId}`);

    // 1. Get the invite details first
    console.log(`🔍 Calling inviteService.getInviteById(${inviteId})`);
    const invite = await inviteService.getInviteById(inviteId);
    console.log(`🔍 getInviteById result:`, invite);
    
    if (!invite) {
      throw new Error(`Invite ${inviteId} not found`);
    }

    console.log(`📋 Found invite: ${invite.email} -> ${invite.transcriptionId} (${invite.status})`);
    console.log(`🔍 Authorization check: invitedBy="${invite.invitedBy}" vs requestorUserId="${requestorUserId}"`);

    // 2. Verify authorization - only the person who sent the invite can revoke it
    if (invite.invitedBy !== requestorUserId) {
      console.error(`❌ Authorization failed: ${invite.invitedBy} !== ${requestorUserId}`);
      throw new Error(`Unauthorized: Only the person who sent the invite can revoke it. Invite was sent by "${invite.invitedBy}" but revoke requested by "${requestorUserId}"`);
    }

    // 3. If the invite was accepted, remove the user from the transcription ACLs
    if (invite.status === 'accepted') {
      console.log(`📝 Invite was accepted - removing user from transcription ACLs`);
      
      // Use acceptedByUserId if available (new field), fallback to email for older invites
      const userIdToRemove = invite.acceptedByUserId || invite.email;
      console.log(`🔍 Removing user from ACLs: ${userIdToRemove} (using ${invite.acceptedByUserId ? 'userId' : 'email as fallback'})`);
      
      await this.removeUserFromTranscription(
        invite.transcriptionId,
        userIdToRemove,
        invite.permissionLevel
      );
    } else {
      console.log(`ℹ️ Invite was not accepted (status: ${invite.status}) - skipping ACL cleanup`);
    }

    // 4. Delete the invite
    console.log(`🗑️ Deleting invite record: ${inviteId}`);
    await inviteService.deleteInvite(inviteId);

    console.log(`✅ Invite ${inviteId} revoked successfully`);

    return {
      inviteId,
      email: invite.email,
      transcriptionId: invite.transcriptionId,
      wasAccepted: invite.status === 'accepted',
      permissionLevel: invite.permissionLevel
    };
  }
}

module.exports = { RevokeInviteUseCase }; 