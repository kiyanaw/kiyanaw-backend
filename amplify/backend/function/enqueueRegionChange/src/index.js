const assert = require('assert').strict
const AWS = require('aws-sdk')

const sqs = new AWS.SQS({ region: process.env.REGION })
const queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/${process.env.ACCOUNT_ID}/enqueueRegionChanges-${process.env.ENV}`

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
      eventName: record.eventName,
      new: record.dynamodb.NewImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) : null,
      old: record.dynamodb.OldImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) : null,
    }))
    console.log('Records', records)
    const item = records.pop()

    // For DELETE events, use the old image; for INSERT/MODIFY, use the new image
    const sourceItem = item.new || item.old
    if (!(item && sourceItem && sourceItem.id)) {
      console.warn('Got dynamo record, but no item id!')
      return okResponse()
    }
    regionId = sourceItem.id
    console.log('Processing', item.eventName, 'event for region:', regionId)
  }

  // push ID to the queue
  const params = {
    MessageBody: regionId,
    QueueUrl: queueUrl,
  }

  const response = await sqs.sendMessage(params).promise()
  console.log('SQS response', response)
  return okResponse()
}
