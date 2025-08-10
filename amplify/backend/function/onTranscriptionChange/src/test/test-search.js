const assert = require('assert')
const sinon = require('sinon')

const search = require('../lib/search')
const { client } = require('../lib/es')

describe('search.clearKnownWordsForTranscription()', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.ENV = 'test'
  })
  
  afterEach(function () {
    sinon.restore()
    delete process.env.ENV
  })
  
  it('should run a delete query for transcription', async function () {
    const deleteStub = sinon.stub(client, 'deleteByQuery').resolves({ deleted: 10 })

    const response = await search.clearKnownWordsForTranscription('transcription-123')

    assert.ok(deleteStub.called)

    assert.deepEqual(deleteStub.args[0][0], {
      index: 'knownwords-test',
      body: {
        query: {
          match: { transcriptionId: 'transcription-123' },
        },
      },
    })

    assert.deepEqual(response, { deleted: 10 })
  })
})