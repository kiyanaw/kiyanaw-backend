const assert = require('assert').strict
const sinon = require('sinon')

// Set up global AWS mocks
const { mockSendMessageBatch } = require('./setup')
const AWS = require('aws-sdk')

const handler = require('../index').handler
const dynamo = require('../lib/dynamo')
const search = require('../lib/search')
const s3 = require('../lib/s3')

describe('onTranscriptionChange handler()', function () {
  beforeEach(function () {
    // Set up environment variables for tests
    process.env.ENV = 'test'
    process.env.API_KIYANAW_REGIONTABLE_NAME = 'Region-test'
    process.env.ACCOUNT_ID = '123456789012'
    process.env.REGION = 'us-east-1'
    
    // Reset mock
    mockSendMessageBatch.resetHistory()
  })
  
  afterEach(function () {
    // Only restore non-AWS stubs to preserve the AWS mock
    search.clearKnownWordsForTranscription?.restore?.()
    dynamo.query?.restore?.()
    s3.deleteTranscriptionFiles?.restore?.()
    
    delete process.env.ENV
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
    delete process.env.ACCOUNT_ID
    delete process.env.REGION
  })

  it('should handle transcription deletion by clearing OpenSearch and deleting S3 files', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 5 })
    const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles').resolves([
      { status: 'fulfilled', value: { VersionId: 'v1' } },
      { status: 'fulfilled', value: { VersionId: 'v2' } }
    ])
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'REMOVE',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription',
            source: 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
          })
          // No NewImage for REMOVE events
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(searchStub.called)
    assert.equal(searchStub.args[0][0], 'transcription-123')
    assert.ok(s3Stub.called)
    assert.equal(s3Stub.args[0][0], 'https://test-bucket.s3.amazonaws.com/public/video.mp4')
  })

  it('should handle transcription deletion without source URL', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 5 })
    const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles')
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'REMOVE',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription'
            // No source field
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(searchStub.called)
    assert.equal(searchStub.args[0][0], 'transcription-123')
    assert.ok(!s3Stub.called) // S3 deletion should not be called
  })

  it('should handle isPrivate changing to true by clearing OpenSearch', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 3 })
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: true,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(searchStub.called)
    assert.equal(searchStub.args[0][0], 'transcription-123')
  })

  it('should handle lang becoming invalid by clearing OpenSearch', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 2 })
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: null
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(searchStub.called)
    assert.equal(searchStub.args[0][0], 'transcription-123')
  })

  it('should handle lang change to valid value when public by re-enqueueing regions', async function () {
    const queryStub = sinon.stub(dynamo, 'query').resolves({
      Items: [
        { id: 'region-1' },
        { id: 'region-2' },
        { id: 'region-3' }
      ]
    })
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: null
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(queryStub.called)
    assert.deepEqual(queryStub.args[0][0], {
      TableName: 'Region-test',
      IndexName: 'ByTranscription',
      KeyConditionExpression: 'transcriptionId = :transcriptionId',
      ExpressionAttributeValues: {
        ':transcriptionId': 'transcription-123'
      },
      ProjectionExpression: 'id'
    })
    
    assert.ok(mockSendMessageBatch.called)
  })

  it('should not enqueue regions when lang changes to valid value but transcription is private', async function () {
    const queryStub = sinon.stub(dynamo, 'query')
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: true,
            lang: null
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: true,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!queryStub.called)
    assert.ok(!mockSendMessageBatch.called)
  })

  it('should handle isPrivate changing to false by re-enqueueing regions', async function () {
    const queryStub = sinon.stub(dynamo, 'query').resolves({
      Items: [
        { id: 'region-1' },
        { id: 'region-2' }
      ]
    })
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: true,
            lang: 'crk'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(queryStub.called)
    assert.ok(mockSendMessageBatch.called)
  })

  it('should handle INSERT events without taking action', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription')
    const queryStub = sinon.stub(dynamo, 'query')
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'INSERT',
        dynamodb: {
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!searchStub.called)
    assert.ok(!queryStub.called)
  })

  it('should handle no relevant changes in MODIFY events', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForTranscription')
    const queryStub = sinon.stub(dynamo, 'query')
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk',
            title: 'Old Title'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk',
            title: 'New Title'  // Only title changed
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!searchStub.called)
    assert.ok(!queryStub.called)
  })

  it('should handle bulk enqueueing with batching', async function () {
    const regionIds = []
    for (let i = 0; i < 25; i++) {
      regionIds.push(`region-${i}`)
    }
    
    const queryStub = sinon.stub(dynamo, 'query').resolves({
      Items: regionIds.map(id => ({ id }))
    })
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: true,
            lang: 'crk'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk'
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(queryStub.called)
    
    // Should send 3 batches (10 + 10 + 5)
    assert.equal(mockSendMessageBatch.callCount, 3)
  })
})