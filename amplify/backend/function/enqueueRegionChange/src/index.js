const assert = require('assert').strict
const AWS = require('aws-sdk')

const sqs = new AWS.SQS({ region: process.env.REGION })
const queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/494185203413/enqueueRegionChanges-${process.env.ENV}`

const okResponse = () => {
  return {
    statusCode: 200,
    body: '{"message": "ok"}',
  }
}

exports.handler = async (event) => {
  console.log('Incoming event', JSON.stringify(event))

  let regionId

  // check for REST request
  if (event.httpMethod) {
    regionId = event.pathParameters.regionId
  }

  // check for dynamo change
  if (event.Records) {
    const records = event.Records.map((record) => ({
      new: AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
      old: AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage),
    }))
    console.log('Records', records)
    const item = records.pop()

    if (!(item && item.new.id)) {
      console.warn('Got dynamo record, but no item id!')
      return okResponse()
    }
    regionId = item.new.id
  }

  // push ID to the queue
  const params = {
    // DelaySeconds: 10,
    MessageBody: regionId,
    // TODO: this only works with fifo?
    // MessageDeduplicationId: regionId.replace('_', '-'),
    QueueUrl: queueUrl,
  }

  const response = await sqs.sendMessage(params).promise()
  console.log('SQS response', response)
  return okResponse()
}
