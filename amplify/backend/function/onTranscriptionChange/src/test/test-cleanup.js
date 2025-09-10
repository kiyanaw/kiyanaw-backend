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
    process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME = 'Transcription-test'
  })
  
  afterEach(function () {
    // Restore all stubs
    dynamo.getRegionsForTranscription?.restore?.()
    dynamo.getIssuesForTranscription?.restore?.()
    dynamo.getInvitesForTranscription?.restore?.()
    dynamo.batchWrite?.restore?.()
    dynamo.deleteItem?.restore?.()
    search.clearKnownWordsForTranscription?.restore?.()
    search.clearIssuesForTranscription?.restore?.()
    s3.deleteTranscriptionFiles?.restore?.()
    
    delete process.env.ENV
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
    delete process.env.API_KIYANAW_ISSUETABLE_NAME
    delete process.env.API_KIYANAW_INVITETABLE_NAME
    delete process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
  })

  describe('deleteRegionsForTranscription', function () {
    it('should delete all regions for a transcription', async function () {
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([
        { id: 'region-1' },
        { id: 'region-2' },
        { id: 'region-3' }
      ])
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 3)
      assert.ok(getRegionsStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify function was called with correct parameters
      assert.equal(getRegionsStub.args[0][0], 'transcription-123')
      assert.equal(getRegionsStub.args[0][1], 'Region-test')
      
      // Verify batch write parameters
      const batchParams = batchWriteStub.args[0][0]
      assert.equal(Object.keys(batchParams.RequestItems)[0], 'Region-test')
      assert.equal(batchParams.RequestItems['Region-test'].length, 3)
    })

    it('should handle no regions found', async function () {
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([])
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 0)
      assert.ok(getRegionsStub.called)
      assert.ok(!batchWriteStub.called)
    })

    it('should handle batch deletion for large numbers of regions', async function () {
      // Create 50 regions to test batching (batch size is 25)
      const regions = []
      for (let i = 1; i <= 50; i++) {
        regions.push({ id: `region-${i}` })
      }
      
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves(regions)
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 50)
      assert.equal(batchWriteStub.callCount, 2) // Should be called twice for 50 items
    })

    it('should handle errors gracefully', async function () {
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').rejects(new Error('DynamoDB error'))
      
      const result = await cleanup.deleteRegionsForTranscription('transcription-123')
      
      assert.equal(result.success, false)
      assert.equal(result.deleted, 0)
      assert.ok(result.error)
      assert.equal(result.error.message, 'DynamoDB error')
    })
  })

  describe('deleteIssuesForTranscription', function () {
    it('should delete all issues for a transcription', async function () {
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([
        { id: 'issue-1' },
        { id: 'issue-2' }
      ])
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 2)
      assert.ok(getIssuesStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify function was called with correct parameters
      assert.equal(getIssuesStub.args[0][0], 'transcription-123')
      assert.equal(getIssuesStub.args[0][1], 'Issue-test')
    })

    it('should handle no issues found', async function () {
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([])
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite')
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 0)
      assert.ok(!batchWriteStub.called)
    })

    it('should handle errors gracefully', async function () {
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').rejects(new Error('Query failed'))
      
      const result = await cleanup.deleteIssuesForTranscription('transcription-123')
      
      assert.equal(result.success, false)
      assert.equal(result.deleted, 0)
      assert.ok(result.error)
    })
  })

  describe('deleteInvitesForTranscription', function () {
    it('should delete all invites for a transcription', async function () {
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([
        { id: 'invite-1' },
        { id: 'invite-2' },
        { id: 'invite-3' }
      ])
      
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.deleteInvitesForTranscription('transcription-123')
      
      assert.equal(result.success, true)
      assert.equal(result.deleted, 3)
      assert.ok(getInvitesStub.called)
      assert.ok(batchWriteStub.called)
      
      // Verify function was called with correct parameters
      assert.equal(getInvitesStub.args[0][0], 'transcription-123')
      assert.equal(getInvitesStub.args[0][1], 'Invite-test')
    })

    it('should handle no invites found', async function () {
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([])
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
      
      // Mock DynamoDB operations using new functions
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([
        { id: 'region-1' }, { id: 'region-2' }
      ])
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([
        { id: 'issue-1' }
      ])
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([
        { id: 'invite-1' }
      ])
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      const deleteItemStub = sinon.stub(dynamo, 'deleteItem').resolves({})
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, false)
      assert.equal(result.totalDeleted, 15) // 5 words + 3 issues (OpenSearch) + 2 regions + 1 issue + 1 invite (DynamoDB) + 2 S3 files + 1 transcription record = 15
      
      // Verify all cleanup operations were called
      assert.ok(searchWordsStub.called)
      assert.ok(searchIssuesStub.called)
      assert.ok(s3Stub.called)
      assert.ok(getRegionsStub.called)
      assert.ok(getIssuesStub.called)
      assert.ok(getInvitesStub.called)
      assert.equal(batchWriteStub.callCount, 3) // Called for regions, issues, and invites
      assert.ok(deleteItemStub.called) // Called for transcription record hard delete
    })

    it('should handle cleanup without S3 source URL', async function () {
      // Mock all the dependencies
      const searchWordsStub = sinon.stub(search, 'clearKnownWordsForTranscription').resolves({ deleted: 2 })
      const searchIssuesStub = sinon.stub(search, 'clearIssuesForTranscription').resolves({ deleted: 1 })
      const s3Stub = sinon.stub(s3, 'deleteTranscriptionFiles')
      
      // Mock DynamoDB operations with no data using new functions
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([])
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([])
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([])
      const deleteItemStub = sinon.stub(dynamo, 'deleteItem').resolves({})
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', null)
      
      assert.equal(result.hasErrors, false)
      assert.equal(result.totalDeleted, 4) // 2 words + 1 issue + 0 others + 1 transcription record = 4
      
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
      
      // Mock DynamoDB operations to succeed using new functions
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').resolves([{ id: 'region-1' }])
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').resolves([{ id: 'issue-1' }])
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').resolves([]) // No invites
      const batchWriteStub = sinon.stub(dynamo, 'batchWrite').resolves({})
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, true)
      assert.ok(result.totalDeleted > 0) // Some operations should have succeeded
      
      // Verify that successful operations still completed
      assert.ok(searchIssuesStub.called)
      assert.ok(getRegionsStub.called)
      assert.ok(getIssuesStub.called)
      assert.ok(getInvitesStub.called)
      
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
      
      // Mock DynamoDB operations to fail using new functions
      const getRegionsStub = sinon.stub(dynamo, 'getRegionsForTranscription').rejects(new Error('DynamoDB error'))
      const getIssuesStub = sinon.stub(dynamo, 'getIssuesForTranscription').rejects(new Error('DynamoDB error'))
      const getInvitesStub = sinon.stub(dynamo, 'getInvitesForTranscription').rejects(new Error('DynamoDB error'))
      
      const result = await cleanup.cleanupDeletedTranscription('transcription-123', 'https://example.com/video.mp4')
      
      assert.equal(result.hasErrors, true)
      assert.equal(result.totalDeleted, 0)
      
      // Verify all operations were attempted
      assert.ok(searchWordsStub.called)
      assert.ok(searchIssuesStub.called)
      assert.ok(s3Stub.called)
      assert.ok(getRegionsStub.called)
      assert.ok(getIssuesStub.called)
      assert.ok(getInvitesStub.called)
      
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
