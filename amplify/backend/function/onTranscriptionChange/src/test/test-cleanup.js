const assert = require('assert').strict
const sinon = require('sinon')

const cleanup = require('../lib/cleanup')
const dynamo = require('../lib/dynamo')
const search = require('../lib/search')
const s3 = require('../lib/s3')

describe('cleanup module', function () {
  beforeEach(function () {
    // Set up environment variables for tests
    process.env.ENV = 'test'
    process.env.API_KIYANAW_REGIONTABLE_NAME = 'Region-test'
    process.env.API_KIYANAW_ISSUETABLE_NAME = 'Issue-test'
    process.env.API_KIYANAW_INVITETABLE_NAME = 'Invite-test'
  })
  
  afterEach(function () {
    // Restore all stubs
    dynamo.query?.restore?.()
    dynamo.scan?.restore?.()
    dynamo.batchWrite?.restore?.()
    search.clearKnownWordsForTranscription?.restore?.()
    search.clearIssuesForTranscription?.restore?.()
    s3.deleteTranscriptionFiles?.restore?.()
    
    delete process.env.ENV
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
    delete process.env.API_KIYANAW_ISSUETABLE_NAME
    delete process.env.API_KIYANAW_INVITETABLE_NAME
  })

  describe('deleteRegionsForTranscription', function () {
    it('should delete all regions for a transcription', async function () {
      const queryStub = sinon.stub(dynamo, 'query').resolves({
        Items: [
          { id: 'region-1' },
          { id: 'region-2' },
          { id: 'region-3' }
        ]
      })
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 3)
      assert.ok(queryStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify query parameters
      const queryParams = queryStub.args[0][0]
      assert.equal(queryParams.TableName, 'Region-test')
      assert.equal(queryParams.IndexName, 'ByTranscription')
      assert.equal(queryParams.ExpressionAttributeValues[':transcriptionId'], 'transcription-123')
      
      // Verify batch write parameters
      const batchParams = batchWriteStub.args[0][0]
      assert.equal(Object.keys(batchParams.RequestItems)[0], 'Region-test')
      assert.equal(batchParams.RequestItems['Region-test'].length, 3)
    })

    it('should handle no regions found', async function () {
      const queryStub = sinon.stub(dynamo, 'query').resolves({ Items: [] })
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 0)
      assert.ok(queryStub.called)
      assert.ok(!batchWriteStub.called)
    })

    it('should handle batch deletion for large numbers of regions', async function () {
      // Create 50 regions to test batching (batch size is 25)
      const regions = []
      for (let i = 1; i <= 50; i++) {
        regions.push({ id: `region-${i}` })
      }
      
      const queryStub = sinon.stub(dynamo, 'query').resolves({ Items: regions })
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 50)
      assert.equal(batchWriteStub.callCount, 2) // Should be called twice for 50 items
    })

    it('should handle errors gracefully', async function () {
      const queryStub = sinon.stub(dynamo, 'query').rejects(new Error('DynamoDB error'))
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, false)
      assert.equal(result.deleted, 0)
      assert.ok(result.error)
      assert.equal(result.error.message, 'DynamoDB error')
    })
  })

  describe('deleteIssuesForTranscription', function () {
    it('should delete all issues for a transcription', async function () {
      const scanStub = sinon.stub(dynamo, 'scan').resolves({
        Items: [
          { id: 'issue-1' },
          { id: 'issue-2' }
        ]
      })
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 2)
      assert.ok(scanStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify scan parameters
      const scanParams = scanStub.args[0][0]
      assert.equal(scanParams.TableName, 'Issue-test')
      assert.equal(scanParams.ExpressionAttributeValues[':transcriptionId'], 'transcription-123')
    })

    it('should handle no issues found', async function () {
      const scanStub = sinon.stub(dynamo, 'scan').resolves({ Items: [] })
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 0)
      assert.ok(!batchWriteStub.called)
    })

    it('should handle errors gracefully', async function () {
      const scanStub = sinon.stub(dynamo, 'scan').rejects(new Error('Scan failed'))
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, false)
      assert.equal(result.deleted, 0)
      assert.ok(result.error)
    })
  })

  describe('deleteInvitesForTranscription', function () {
    it('should delete all invites for a transcription', async function () {
      const scanStub = sinon.stub(dynamo, 'scan').resolves({
        Items: [
          { id: 'invite-1' },
          { id: 'invite-2' },
          { id: 'invite-3' }
        ]
      })
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteInvitesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 3)
      assert.ok(scanStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify scan parameters
      const scanParams = scanStub.args[0][0]
      assert.equal(scanParams.TableName, 'Invite-test')
      assert.equal(scanParams.ExpressionAttributeValues[':transcriptionId'], 'transcription-123')
    })

    it('should handle no invites found', async function () {
      const scanStub = sinon.stub(dynamo, 'scan').resolves({ Items: [] })
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
      
      const result = await cleanup.deleteInvitesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 0)
      assert.ok(!batchWriteStub.called)
    })
  })

  describe('cleanupDeletedTranscription', function () {
    it('should perform comprehensive cleanup successfully', async function () {
      // Mock all the dependencies
      const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 5 })
      const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 3 })
      const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles').resolves([
        { status: 'fulfilled', value: { VersionId: 'v1' } },
        { status: 'fulfilled', value: { VersionId: 'v2' } }
      ])
      
      // Mock DynamoDB operations
      const queryStub = sinon.stub(dynamo, 'query').resolves({
        Items: [{ id: 'region-1' }, { id: 'region-2' }]
      })
      const scanStub = sinon.stub(dynamo, 'scan')
        .onFirstCall().resolves({ Items: [{ id: 'issue-1' }] })  // Issues scan
        .onSecondCall().resolves({ Items: [{ id: 'invite-1' }] }) // Invites scan
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, false)
      assert.equal(result.totalDeleted, 14) // 5 words + 3 issues (OpenSearch) + 2 regions + 1 issue + 1 invite (DynamoDB) + 2 S3 files = 14
      
      // Verify all cleanup operations were called
      assert.ok(searchWordsStub.called)
      assert.ok(searchIssuesStub.called)
      assert.ok(s3Stub.called)
      assert.ok(queryStub.called)
      assert.equal(scanStub.callCount, 2) // Called for issues and invites
      assert.equal(batchWriteStub.callCount, 3) // Called for regions, issues, and invites
    })

    it('should handle cleanup without S3 source URL', async function () {
      // Mock all the dependencies
      const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 2 })
      const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 1 })
      const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles')
      
      // Mock DynamoDB operations with no data
      const queryStub = sinon.stub(dynamo, 'query').resolves({ Items: [] })
      const scanStub = sinon.stub(dynamo, 'scan').resolves({ Items: [] })
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', null)
      
      assert.equal(result.hasErrors, false)
      assert.equal(result.totalDeleted, 3) // 2 words + 1 issue + 0 others
      
      // Verify S3 deletion was not called
      assert.ok(!s3Stub.called)
      
      // Verify OpenSearch cleanup was called
      assert.ok(searchWordsStub.called)
      assert.ok(searchIssuesStub.called)
    })

    it('should continue cleanup even when some operations fail', async function () {
      // Mock some operations to succeed and others to fail
      const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').rejects(new Error('OpenSearch down'))
      const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 2 })
      const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles').rejects(new Error('S3 error'))
      
      // Mock DynamoDB operations to succeed
      const queryStub = sinon.stub(dynamo, 'query').resolves({ Items: [{ id: 'region-1' }] })
      const scanStub = sinon.stub(dynamo, 'scan')
        .onFirstCall().resolves({ Items: [{ id: 'issue-1' }] })
        .onSecondCall().resolves({ Items: [] }) // No invites
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, true)
      assert.ok(result.totalDeleted > 0) // Some operations should have succeeded
      
      // Verify that successful operations still completed
      assert.ok(searchIssuesStub.called)
      assert.ok(queryStub.called)
      assert.equal(scanStub.callCount, 2)
      
      // Verify error details are captured
      assert.ok(result.summary.openSearchWords.error)
      assert.ok(result.summary.s3Files.error)
      assert.equal(result.summary.openSearchIssues.success, true)
    })

    it('should handle all operations failing gracefully', async function () {
      // Mock all operations to fail
      const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').rejects(new Error('Search error'))
      const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').rejects(new Error('Search error'))
      const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles').rejects(new Error('S3 error'))
      
      // Mock DynamoDB operations to fail
      const queryStub = sinon.stub(dynamo, 'query').rejects(new Error('DynamoDB error'))
      const scanStub = sinon.stub(dynamo, 'scan').rejects(new Error('DynamoDB error'))
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, true)
      assert.equal(result.totalDeleted, 0)
      
      // Verify all operations were attempted
      assert.ok(searchWordsStub.called)
      assert.ok(searchIssuesStub.called)
      assert.ok(s3Stub.called)
      assert.ok(queryStub.called)
      assert.equal(scanStub.callCount, 2)
      
      // Verify all errors are captured
      assert.ok(result.summary.openSearchWords.error)
      assert.ok(result.summary.openSearchIssues.error)
      assert.ok(result.summary.s3Files.error)
      assert.ok(result.summary.dynamoRegions.error)
      assert.ok(result.summary.dynamoIssues.error)
      assert.ok(result.summary.dynamoInvites.error)
    })
  })
})
