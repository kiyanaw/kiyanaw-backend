// Global test setup - mocks AWS services before any modules are required
const sinon = require('sinon')
const AWS = require('aws-sdk')

// Mock SQS
const mockSendMessageBatch = sinon.stub().returns({
  promise: sinon.stub().resolves({
    Successful: [{ Id: '0' }],
    Failed: []
  })
})

const mockSQS = {
  sendMessageBatch: mockSendMessageBatch
}

// Mock S3
const mockDeleteObject = sinon.stub().returns({
  promise: sinon.stub().resolves({ VersionId: 'version123' })
})

const mockS3 = {
  deleteObject: mockDeleteObject
}

// Apply mocks globally
sinon.stub(AWS, 'SQS').returns(mockSQS)
sinon.stub(AWS, 'S3').returns(mockS3)

// Export mocks for use in individual tests
module.exports = {
  mockSendMessageBatch,
  mockDeleteObject,
  mockSQS,
  mockS3
}