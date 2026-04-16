const { SQSClient, SendMessageBatchCommand } = require('@aws-sdk/client-sqs')

const sqsClient = new SQSClient({ region: process.env.REGION })

/**
 * Send a batch of messages to SQS.
 * Exported as a named function so tests can stub it at the module level.
 * @param {{ QueueUrl: string, Entries: Array }} params
 * @returns {Promise<object>}
 */
const sendMessageBatch = async (params) => {
  return sqsClient.send(new SendMessageBatchCommand(params))
}

module.exports = { sendMessageBatch }
