const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { InternalError } = require('../errors/invite-errors');

/**
 * Transcription Service for Lambda
 * 
 * Handles batch retrieval of transcription data for invite processing
 */
class TranscriptionService {
  constructor() {
    // Initialize DynamoDB client
    const client = new DynamoDBClient({ region: process.env.REGION });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;
  }

  /**
   * Batch get transcriptions by IDs with efficient chunking
   * @param {string[]} transcriptionIds - Array of transcription IDs to retrieve
   * @returns {Object} Map of transcriptionId -> transcription data
   */
  async getTranscriptionsByIds(transcriptionIds) {
    if (!this.tableName) {
      throw new InternalError('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
    }

    if (!transcriptionIds || transcriptionIds.length === 0) {
      console.log('📊 No transcription IDs provided, returning empty map');
      return {};
    }

    console.log(`📊 Batch loading ${transcriptionIds.length} transcriptions...`);

    // DynamoDB BatchGetItem has a limit of 100 items per request
    const chunks = this.chunkArray(transcriptionIds, 100);
    const allTranscriptions = {};
    let totalRetrieved = 0;

    for (const chunk of chunks) {
      const keys = chunk.map(id => ({ id }));
      
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys,
            // Only get the fields we need for card rendering to reduce data transfer
            ProjectionExpression: 'id, title, author, authorFriendly, #type, #length, coverage, issueCount, regionCount, commentCount, isPrivate, dateLastUpdated, userLastUpdated, createdAt, updatedAt',
            ExpressionAttributeNames: {
              '#type': 'type',
              '#length': 'length'
            }
          }
        }
      });

      try {
        const result = await this.docClient.send(command);
        const transcriptions = result.Responses[this.tableName] || [];
        
        // Build lookup map
        transcriptions.forEach(transcription => {
          allTranscriptions[transcription.id] = transcription;
        });

        totalRetrieved += transcriptions.length;
        
        if (result.UnprocessedKeys && Object.keys(result.UnprocessedKeys).length > 0) {
          console.warn(`⚠️ Some keys were unprocessed in batch get, may need retry logic`);
        }

      } catch (error) {
        console.error(`❌ Error in batch get for chunk:`, error);
        throw new InternalError(`Failed to retrieve transcription data: ${error.message}`);
      }
    }

    console.log(`✅ Batch retrieved ${totalRetrieved} transcriptions out of ${transcriptionIds.length} requested`);
    
    // Log any missing transcriptions for debugging
    const missingIds = transcriptionIds.filter(id => !allTranscriptions[id]);
    if (missingIds.length > 0) {
      console.warn(`⚠️ Missing transcriptions for IDs: ${missingIds.join(', ')}`);
    }

    return allTranscriptions;
  }

  /**
   * Utility to chunk array into smaller arrays for batch processing
   * @param {Array} array - Array to chunk
   * @param {number} size - Size of each chunk
   * @returns {Array[]} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get the configured table name for debugging
   * @returns {string} The DynamoDB table name
   */
  getTableName() {
    return this.tableName;
  }
}

// Export singleton instance
module.exports = new TranscriptionService();
