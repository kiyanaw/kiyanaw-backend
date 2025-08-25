const assert = require('assert')

// Mock the dependencies
const mockS3 = {
  fileExists: jest.fn(),
  getS3File: jest.fn(),
  putS3File: jest.fn()
}

const mockAudio = {
  isVideoFormat: jest.fn(),
  extractAudioFromVideo: jest.fn(),
  generateWaveform: jest.fn(),
  processPeaksData: jest.fn(),
  cleanupFiles: jest.fn()
}

jest.mock('../lib/s3', () => mockS3)
jest.mock('../lib/audio', () => mockAudio)

const peaks = require('../lib/peaks')

describe('peaks utilities', function () {
  beforeEach(function () {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock behaviors
    mockS3.fileExists.mockResolvedValue(false)
    mockS3.getS3File.mockResolvedValue({ path: '/mnt/temp/test-file.mp3' })
    mockS3.putS3File.mockResolvedValue({ ETag: 'etag123' })
    
    mockAudio.isVideoFormat.mockReturnValue(false)
    mockAudio.extractAudioFromVideo.mockResolvedValue('/mnt/temp/audio.mp3')
    mockAudio.generateWaveform.mockResolvedValue('/mnt/temp/audio.json')
    mockAudio.processPeaksData.mockResolvedValue({ data: [0.1, 0.2, 0.3] })
    mockAudio.cleanupFiles.mockResolvedValue()
  })

  describe('extractUrlFromRecord()', function () {
    it('should extract URL from DynamoDB NewImage', function () {
      const record = {
        dynamodb: {
          NewImage: {
            source: { S: 'https://bucket.s3.amazonaws.com/file.mp3' }
          }
        }
      }
      
      const result = peaks.extractUrlFromRecord(record)
      assert.equal(result, 'https://bucket.s3.amazonaws.com/file.mp3')
    })

    it('should extract URL from DynamoDB OldImage', function () {
      const record = {
        dynamodb: {
          OldImage: {
            source: { S: 'https://bucket.s3.amazonaws.com/file.mp3' }
          }
        }
      }
      
      const result = peaks.extractUrlFromRecord(record)
      assert.equal(result, 'https://bucket.s3.amazonaws.com/file.mp3')
    })

    it('should extract URL from SQS record', function () {
      const record = {
        body: 'https://bucket.s3.amazonaws.com/file.mp3'
      }
      
      const result = peaks.extractUrlFromRecord(record)
      assert.equal(result, 'https://bucket.s3.amazonaws.com/file.mp3')
    })

    it('should return null for record without URL', function () {
      const record = {
        dynamodb: {}
      }
      
      const result = peaks.extractUrlFromRecord(record)
      assert.equal(result, null)
    })
  })

  describe('processPeaksFile()', function () {
    it('should process audio file successfully', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/audio.mp3'
      
      const result = await peaks.processPeaksFile(url)
      
      assert.ok(mockS3.fileExists.mock.calls.some(call => call[0] === 'test-bucket' && call[1] === 'public/audio.mp3.json'))
      assert.ok(mockS3.getS3File.mock.calls.some(call => call[0] === 'test-bucket' && call[1] === 'public/audio.mp3' && call[2] === 'audio.mp3'))
      assert.ok(mockAudio.generateWaveform.mock.calls.some(call => call[0] === '/mnt/temp/test-file.mp3'))
      assert.ok(mockAudio.processPeaksData.mock.calls.some(call => call[0] === '/mnt/temp/audio.json'))
      assert.ok(mockS3.putS3File.mock.calls.some(call => call[0] === 'test-bucket' && call[1] === 'public/audio.mp3.json'))
      assert.ok(mockAudio.cleanupFiles.mock.calls.length > 0)
      
      assert.deepEqual(result, { success: true, result: { ETag: 'etag123' } })
    })

    it('should process video file successfully', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/video.mp4'
      mockAudio.isVideoFormat.mockReturnValue(true)
      
      const result = await peaks.processPeaksFile(url)
      
      assert.ok(mockAudio.isVideoFormat.mock.calls.some(call => call[0] === 'mp4'))
      assert.ok(mockAudio.extractAudioFromVideo.mock.calls.length > 0)
      assert.ok(mockAudio.generateWaveform.mock.calls.length > 0)
      assert.ok(mockAudio.processPeaksData.mock.calls.length > 0)
      assert.ok(mockS3.putS3File.mock.calls.length > 0)
      
      assert.deepEqual(result, { success: true, result: { ETag: 'etag123' } })
    })

    it('should skip processing if peaks file already exists', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/audio.mp3'
      mockS3.fileExists.mockResolvedValue(true)
      
      const result = await peaks.processPeaksFile(url)
      
      assert.ok(mockS3.fileExists.mock.calls.length > 0)
      assert.ok(mockS3.getS3File.mock.calls.length === 0)
      assert.ok(mockAudio.generateWaveform.mock.calls.length === 0)
      
      assert.deepEqual(result, { success: true, message: 'Peaks file already exists' })
    })

    it('should handle S3 download errors', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/audio.mp3'
      mockS3.getS3File.mockRejectedValue(new Error('S3 download failed'))
      
      try {
        await peaks.processPeaksFile(url)
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'Failed to download file from S3: S3 download failed')
      }
    })

    it('should handle processing errors and upload error payload', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/audio.mp3'
      mockAudio.generateWaveform.mockRejectedValue(new Error('Processing failed'))
      
      try {
        await peaks.processPeaksFile(url)
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'Processing failed')
        
        // Should have tried to upload error payload
        assert.ok(mockS3.putS3File.mock.calls.length > 0)
        // Check that the error payload was uploaded
        const uploadedData = mockS3.putS3File.mock.calls[0][2] // The JSON data is at index 2
        assert.ok(typeof uploadedData === 'string')
        const errorPayload = JSON.parse(uploadedData)
        assert.equal(errorPayload.error, 'Processing failed')
        assert.ok(errorPayload.timestamp)
        assert.equal(errorPayload.url, url)
      }
    })

    it('should cleanup files even on error', async function () {
      const url = 'https://test-bucket.s3.amazonaws.com/public/audio.mp3'
      mockAudio.generateWaveform.mockRejectedValue(new Error('Processing failed'))
      
      try {
        await peaks.processPeaksFile(url)
        assert.fail('Should have thrown an error')
      } catch (error) {
        // Should still cleanup files
        assert.ok(mockAudio.cleanupFiles.mock.calls.length > 0)
      }
    })
  })
})
