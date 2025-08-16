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
    process.env.API_KIYANAW_ISSUETABLE_NAME = 'Issue-test'
    process.env.API_KIYANAW_INVITETABLE_NAME = 'Invite-test'
    process.env.ACCOUNT_ID = '123456789012'
    process.env.REGION = 'us-east-1'
    
    // Reset mock
    mockSendMessageBatch.resetHistory()
  })
  
  afterEach(function () {
    // Only restore non-AWS stubs to preserve the AWS mock
    search.clearKnownWordsForTranscription?.restore?.()
    search.clearIssuesForTranscription?.restore?.()
    dynamo.query?.restore?.()
    dynamo.getRegionsForTranscription?.restore?.()
    dynamo.getIssuesForTranscription?.restore?.()
    dynamo.getInvitesForTranscription?.restore?.()
    dynamo.batchWrite?.restore?.()
    dynamo.deleteItem?.restore?.()
    s3.deleteTranscriptionFiles?.restore?.()
    
    delete process.env.ENV
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
    delete process.env.API_KIYANAW_ISSUETABLE_NAME
    delete process.env.API_KIYANAW_INVITETABLE_NAME
    delete process.env.ACCOUNT_ID
    delete process.env.REGION
  })

  it('should handle transcription deletion by clearing OpenSearch and deleting S3 files', async function () {
    const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 5 })
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 3 })
    const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles').resolves([
      { status: 'fulfilled', value: { VersionId: 'v1' } },
      { status: 'fulfilled', value: { VersionId: 'v2' } }
    ])
    
    // Mock DynamoDB operations for cleanup using new functions
    const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([{ id: 'region-1' }])
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([{ id: 'issue-1' }])
    const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([{ id: 'invite-1' }])
    const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
    const deleteItemStub = sinon.stub(dynamo, 'deleteItem').resolves({})
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription',
            source: 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription',
            source: 'https://test-bucket.s3.amazonaws.com/public/video.mp4',
            _deleted: true,
            _ttl: 1757814480
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    
    // Verify comprehensive cleanup was performed
    assert.ok(searchWordsStub.called)
    assert.equal(searchWordsStub.args[0][0], 'transcription-123')
    assert.ok(searchIssuesStub.called)
    assert.equal(searchIssuesStub.args[0][0], 'transcription-123')
    assert.ok(s3Stub.called)
    assert.equal(s3Stub.args[0][0], 'https://test-bucket.s3.amazonaws.com/public/video.mp4')
    
    // Verify DynamoDB cleanup was performed
    assert.ok(getRegionsStub.called) // For regions
    assert.ok(getIssuesStub.called) // For issues
    assert.ok(getInvitesStub.called) // For invites
    assert.equal(batchWriteStub.callCount, 3) // For regions, issues, and invites
    
    // Verify hard delete was performed (called by cleanup function)
    assert.ok(deleteItemStub.called)
    assert.equal(deleteItemStub.args[0][0].TableName, process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME)
    assert.equal(deleteItemStub.args[0][0].Key.id, 'transcription-123')
  })

  it('should handle transcription deletion without source URL', async function () {
    const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 5 })
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 2 })
    const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles')
    
    // Mock DynamoDB operations for cleanup (no data to delete) using new functions
    const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([])
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([])
    const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([])
    const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
    const deleteItemStub = sinon.stub(dynamo, 'deleteItem').resolves({})
    
    const event = {
      Records: [{
        eventID: 'test-event-id',
        eventName: 'MODIFY',
        dynamodb: {
          OldImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription'
            // No source field
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            title: 'Test Transcription',
            _deleted: true,
            _ttl: 1757814480
            // No source field
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    
    // Verify OpenSearch cleanup was performed
    assert.ok(searchWordsStub.called)
    assert.equal(searchWordsStub.args[0][0], 'transcription-123')
    assert.ok(searchIssuesStub.called)
    assert.equal(searchIssuesStub.args[0][0], 'transcription-123')
    
    // Verify S3 deletion was not called (no source URL)
    assert.ok(!s3Stub.called)
    
    // Verify DynamoDB cleanup was attempted (even with no data)
    assert.ok(getRegionsStub.called) // For regions
    assert.ok(getIssuesStub.called) // For issues
    assert.ok(getInvitesStub.called) // For invites
    assert.ok(!batchWriteStub.called) // No batch writes since no data to delete
  })

  it('should handle isPrivate changing to true by clearing OpenSearch', async function () {
    const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 3 })
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 1 })
    
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
    assert.ok(searchWordsStub.called)
    assert.equal(searchWordsStub.args[0][0], 'transcription-123')
    assert.ok(searchIssuesStub.called)
    assert.equal(searchIssuesStub.args[0][0], 'transcription-123')
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

  it('should handle publicIssues changing to false by clearing issues from OpenSearch', async function () {
    const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription')
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 4 })
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
            publicIssues: true
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk',
            publicIssues: false
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(searchIssuesStub.called)
    assert.equal(searchIssuesStub.args[0][0], 'transcription-123')
    assert.ok(!searchWordsStub.called) // Words should not be affected
    assert.ok(!queryStub.called) // No region enqueueing should happen
  })

  it('should re-enqueue regions when publicIssues changes to true', async function () {
    const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription')
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription')
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
            isPrivate: false,
            lang: 'crk',
            publicIssues: false
          }),
          NewImage: AWS.DynamoDB.Converter.marshall({
            id: 'transcription-123',
            isPrivate: false,
            lang: 'crk',
            publicIssues: true
          })
        }
      }]
    }

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!searchIssuesStub.called) // Issues should not be cleared when becoming public
    assert.ok(!searchWordsStub.called) // Words should not be affected
    assert.ok(queryStub.called) // Should query for regions to re-enqueue
    assert.ok(mockSendMessageBatch.called) // Should enqueue regions for processing
  })
})