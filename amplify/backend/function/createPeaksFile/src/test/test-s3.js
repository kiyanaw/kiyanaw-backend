const assert = require('assert')

// Mock AWS SDK
const mockSend = jest.fn()
const mockS3Client = {
  send: mockSend
}

// Mock fs
const mockFs = {
  createWriteStream: jest.fn()
}

// Mock the modules
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => mockS3Client),
  GetObjectCommand: jest.fn((params) => params),
  PutObjectCommand: jest.fn((params) => params),
  HeadObjectCommand: jest.fn((params) => params)
}))

jest.mock('fs', () => mockFs)

const s3 = require('../lib/s3')

describe('s3 utilities', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.REGION = 'us-east-1'
    
    // Reset mocks
    mockSend.mockClear()
    mockFs.createWriteStream.mockClear()
  })
  
  afterEach(function () {
    delete process.env.REGION
  })

  describe('getS3File()', function () {
    it('should download file from S3', async function () {
      const mockFile = {
        on: jest.fn().mockReturnThis(),
        path: '/mnt/temp/test-file.mp3'
      }
      
      const mockData = {
        Body: {
          pipe: jest.fn()
        }
      }
      
      mockFs.createWriteStream.mockReturnValue(mockFile)
      mockSend.mockResolvedValue(mockData)
      
      // Mock the file.on('close') to resolve immediately
      mockFile.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(), 0)
        }
        return mockFile
      })
      
      const result = await s3.getS3File('test-bucket', 'path/file.mp3', 'file.mp3')
      
      assert.ok(mockSend.mock.calls.length > 0)
      assert.deepEqual(mockSend.mock.calls[0][0], {
        Bucket: 'test-bucket',
        Key: 'path/file.mp3'
      })
      assert.equal(result, mockFile)
    })

    it('should handle S3 download errors', async function () {
      mockSend.mockRejectedValue(new Error('S3 download failed'))
      
      try {
        await s3.getS3File('test-bucket', 'path/file.mp3', 'file.mp3')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'S3 download failed')
      }
    })
  })

  describe('putS3File()', function () {
    it('should upload file to S3', async function () {
      const mockResponse = { ETag: 'etag123' }
      mockSend.mockResolvedValue(mockResponse)
      
      const result = await s3.putS3File('test-bucket', 'path/file.json', '{"data": "test"}')
      
      assert.ok(mockSend.mock.calls.length > 0)
      assert.deepEqual(mockSend.mock.calls[0][0], {
        Bucket: 'test-bucket',
        Key: 'path/file.json',
        Body: '{"data": "test"}',
        CacheControl: 'max-age=0',
        ContentType: 'application/json'
      })
      assert.deepEqual(result, mockResponse)
    })
  })

  describe('fileExists()', function () {
    it('should return true when file exists', async function () {
      mockSend.mockResolvedValue({})
      
      const result = await s3.fileExists('test-bucket', 'path/file.json')
      
      assert.ok(mockSend.mock.calls.length > 0)
      assert.deepEqual(mockSend.mock.calls[0][0], {
        Key: 'path/file.json',
        Bucket: 'test-bucket'
      })
      assert.equal(result, true)
    })

    it('should return false when file does not exist', async function () {
      const error = new Error('Not found')
      error.name = 'NoSuchKey'
      mockSend.mockRejectedValue(error)
      
      const result = await s3.fileExists('test-bucket', 'path/file.json')
      
      assert.equal(result, false)
    })

    it('should return false for 404 errors', async function () {
      const error = new Error('Not found')
      error.$metadata = { httpStatusCode: 404 }
      mockSend.mockRejectedValue(error)
      
      const result = await s3.fileExists('test-bucket', 'path/file.json')
      
      assert.equal(result, false)
    })

    it('should throw error for other S3 errors', async function () {
      mockSend.mockRejectedValue(new Error('Access denied'))
      
      try {
        await s3.fileExists('test-bucket', 'path/file.json')
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.equal(error.message, 'Access denied')
      }
    })
  })

  describe('efsPath', function () {
    it('should have correct EFS path', function () {
      assert.equal(s3.efsPath, '/mnt/temp')
    })
  })
})
