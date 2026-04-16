// Global test setup - stubs AWS service wrappers before any modules are required
const sinon = require('sinon')
const sqs = require('../lib/sqs')
const s3 = require('../lib/s3')

// Stub SQS sendMessageBatch so handler tests can assert on call count/args
const mockSendMessageBatch = sinon.stub(sqs, 'sendMessageBatch').resolves({
  Successful: [{ Id: '0' }],
  Failed: []
})

// Stub S3 deleteObject so s3 lib tests can assert on call params
const mockDeleteObject = sinon.stub(s3, 'deleteObject').resolves({ VersionId: 'version123' })

module.exports = {
  mockSendMessageBatch,
  mockDeleteObject,
}
