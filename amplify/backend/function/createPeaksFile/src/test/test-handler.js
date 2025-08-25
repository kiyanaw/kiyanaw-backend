const assert = require('assert')

// Mock the dependencies
const mockPeaks = {
  extractUrlFromRecord: jest.fn(),
  processPeaksFile: jest.fn()
}

const mockUtils = {
  okResponse: jest.fn()
}

jest.mock('../lib/peaks', () => mockPeaks)
jest.mock('../utils', () => mockUtils)

// Mock the handler
const handler = require('../index')

describe('handler', function () {
  beforeEach(function () {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock behaviors
    mockUtils.okResponse.mockReturnValue({ statusCode: 200, body: '{"message": "ok"}' })
    mockPeaks.extractUrlFromRecord.mockReturnValue('https://test-bucket.s3.amazonaws.com/file.mp3')
    mockPeaks.processPeaksFile.mockResolvedValue({ success: true })
  })

  describe('DynamoDB events', function () {
    it('should process DynamoDB INSERT event', async function () {
      const event = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://test-bucket.s3.amazonaws.com/file.mp3' }
              }
            }
          }
        ]
      }
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length > 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.some(call => call[0] === 'https://test-bucket.s3.amazonaws.com/file.mp3'))
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })

    it('should process DynamoDB MODIFY event', async function () {
      const event = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'MODIFY',
            dynamodb: {
              NewImage: {
                source: { S: 'https://test-bucket.s3.amazonaws.com/file.mp3' }
              }
            }
          }
        ]
      }
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length > 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.length > 0)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })

    it('should skip DynamoDB REMOVE event', async function () {
      const event = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'REMOVE',
            dynamodb: {
              OldImage: {
                source: { S: 'https://test-bucket.s3.amazonaws.com/file.mp3' }
              }
            }
          }
        ]
      }
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length === 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.length === 0)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })
  })

  describe('SQS events', function () {
    it('should process SQS event', async function () {
      const event = {
        Records: [
          {
            messageId: 'test-message-id',
            body: 'https://test-bucket.s3.amazonaws.com/file.mp3'
          }
        ]
      }
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length > 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.some(call => call[0] === 'https://test-bucket.s3.amazonaws.com/file.mp3'))
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })
  })

  describe('multiple records', function () {
    it('should process multiple records', async function () {
      const event = {
        Records: [
          {
            eventID: 'event-1',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://bucket1.s3.amazonaws.com/file1.mp3' }
              }
            }
          },
          {
            eventID: 'event-2',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://bucket2.s3.amazonaws.com/file2.mp3' }
              }
            }
          }
        ]
      }
      
      const result = await handler.handler(event)
      
      assert.equal(mockPeaks.extractUrlFromRecord.mock.calls.length, 2)
      assert.equal(mockPeaks.processPeaksFile.mock.calls.length, 2)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })

    it('should continue processing when one record fails', async function () {
      const event = {
        Records: [
          {
            eventID: 'event-1',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://bucket1.s3.amazonaws.com/file1.mp3' }
              }
            }
          },
          {
            eventID: 'event-2',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://bucket2.s3.amazonaws.com/file2.mp3' }
              }
            }
          }
        ]
      }
      
      // First record succeeds, second fails
      mockPeaks.processPeaksFile
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Processing failed'))
      
      const result = await handler.handler(event)
      
      assert.equal(mockPeaks.extractUrlFromRecord.mock.calls.length, 2)
      assert.equal(mockPeaks.processPeaksFile.mock.calls.length, 2)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })
  })

  describe('error handling', function () {
    it('should handle records without URL', async function () {
      const event = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'INSERT',
            dynamodb: {}
          }
        ]
      }
      
      mockPeaks.extractUrlFromRecord.mockReturnValue(null)
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length > 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.length === 0)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })

    it('should handle processing errors gracefully', async function () {
      const event = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                source: { S: 'https://test-bucket.s3.amazonaws.com/file.mp3' }
              }
            }
          }
        ]
      }
      
      mockPeaks.processPeaksFile.mockRejectedValue(new Error('Processing failed'))
      
      const result = await handler.handler(event)
      
      assert.ok(mockPeaks.extractUrlFromRecord.mock.calls.length > 0)
      assert.ok(mockPeaks.processPeaksFile.mock.calls.length > 0)
      assert.deepEqual(result, { statusCode: 200, body: '{"message": "ok"}' })
    })
  })
})
