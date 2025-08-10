const assert = require('assert')
const sinon = require('sinon')

// Set up global AWS mocks
const { mockDeleteObject } = require('./setup')
const AWS = require('aws-sdk')

const s3 = require('../lib/s3')

describe('s3 utilities', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME = 'test-transcriptions-bucket'
    
    // Reset mock
    mockDeleteObject.resetHistory()
    mockDeleteObject.returns({
      promise: sinon.stub().resolves({ VersionId: 'version123' })
    })
  })
  
  afterEach(function () {
    // Only restore non-AWS stubs to preserve the AWS mock
    delete process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME
  })

  describe('extractS3Key()', function () {
    it('should extract key from S3 URL', function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/path/file.mp4'
      const key = s3.extractS3Key(url)
      assert.equal(key, 'public/path/file.mp4')
    })

    it('should handle URLs with complex paths', function () {
      const url = 'https://test-bucket.s3.amazonaws.com/folder/subfolder/file-name.mp4'
      const key = s3.extractS3Key(url)
      assert.equal(key, 'folder/subfolder/file-name.mp4')
    })

    it('should return null for invalid URLs', function () {
      const key = s3.extractS3Key('not-a-valid-url')
      assert.equal(key, null)
    })

    it('should return null for null/undefined input', function () {
      assert.equal(s3.extractS3Key(null), null)
      assert.equal(s3.extractS3Key(undefined), null)
    })
  })

  describe('deleteFile()', function () {
    it('should delete a file from S3', async function () {
      const result = await s3.deleteFile('test-bucket', 'path/file.mp4')
      
      assert.ok(mockDeleteObject.called)
      assert.deepEqual(mockDeleteObject.args[0][0], {
        Bucket: 'test-bucket',
        Key: 'path/file.mp4'
      })
      assert.deepEqual(result, { VersionId: 'version123' })
    })

    it('should throw error when deletion fails', async function () {
      mockDeleteObject.returns({
        promise: sinon.stub().rejects(new Error('S3 deletion failed'))
      })

      try {
        await s3.deleteFile('test-bucket', 'path/file.mp4')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'S3 deletion failed')
      }
    })
  })

  describe('deleteTranscriptionFiles()', function () {
    it('should delete both media and JSON files', async function () {
      const sourceUrl = 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
      
      const results = await s3.deleteTranscriptionFiles(sourceUrl)
      
      // Should be called twice - once for media file, once for JSON
      assert.equal(mockDeleteObject.callCount, 2)
      
      // Check first call (media file)
      assert.deepEqual(mockDeleteObject.args[0][0], {
        Bucket: 'test-transcriptions-bucket',
        Key: 'public/video.mp4'
      })
      
      // Check second call (JSON file)
      assert.deepEqual(mockDeleteObject.args[1][0], {
        Bucket: 'test-transcriptions-bucket',
        Key: 'public/video.mp4.json'
      })
      
      assert.equal(results.length, 2)
    })

    it('should handle empty source URL', async function () {
      const results = await s3.deleteTranscriptionFiles('')
      
      assert.equal(mockDeleteObject.callCount, 0)
      assert.equal(results.length, 0)
    })

    it('should handle null source URL', async function () {
      const results = await s3.deleteTranscriptionFiles(null)
      
      assert.equal(mockDeleteObject.callCount, 0)
      assert.equal(results.length, 0)
    })

    it('should handle invalid source URL', async function () {
      const results = await s3.deleteTranscriptionFiles('invalid-url')
      
      assert.equal(mockDeleteObject.callCount, 0)
      assert.equal(results.length, 0)
    })

    it('should handle partial failures gracefully', async function () {
      // First call succeeds, second call fails
      mockDeleteObject
        .onFirstCall().returns({
          promise: sinon.stub().resolves({ VersionId: 'version123' })
        })
        .onSecondCall().returns({
          promise: sinon.stub().rejects(new Error('JSON file not found'))
        })

      const sourceUrl = 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
      const results = await s3.deleteTranscriptionFiles(sourceUrl)
      
      assert.equal(results.length, 2)
      assert.equal(results[0].status, 'fulfilled')
      assert.equal(results[1].status, 'rejected')
      assert.equal(results[1].reason.message, 'JSON file not found')
    })

    it('should throw error when bucket name is not set', async function () {
      delete process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME
      
      try {
        await s3.deleteTranscriptionFiles('https://test-bucket.s3.amazonaws.com/public/video.mp4')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'STORAGE_TRANSCRIPTIONS_BUCKETNAME environment variable not set')
      }
    })
  })
})