const sinon = require('sinon')

// Mock AWS SDK
const mockSend = sinon.stub()
const mockS3Client = {
  send: mockSend
}

const mockGetObject = sinon.stub()
const mockPutObject = sinon.stub()
const mockHeadObject = sinon.stub()

// Mock child_process
const mockExec = sinon.stub()

// Mock fs
const mockFs = {
  createWriteStream: sinon.stub(),
  readFileSync: sinon.stub(),
  existsSync: sinon.stub()
}

// Setup default mock behaviors
mockSend.returns({
  promise: sinon.stub().resolves({})
})

mockExec.returns({
  promise: sinon.stub().resolves()
})

mockFs.createWriteStream.returns({
  on: sinon.stub().returnsThis(),
  path: '/mnt/temp/test-file.mp3'
})

mockFs.readFileSync.returns('{"data": [1, 2, 3, 4, 5]}')
mockFs.existsSync.returns(true)

// Export mocks for use in tests
module.exports = {
  mockSend,
  mockS3Client,
  mockGetObject,
  mockPutObject,
  mockHeadObject,
  mockExec,
  mockFs
}
