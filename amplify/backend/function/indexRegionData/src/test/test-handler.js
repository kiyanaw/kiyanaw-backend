const assert = require('assert').strict
const sinon = require('sinon')

const handler = require('../index').handler
const dynamo = require('../lib/dynamo')
const search = require('../lib/search')

// mock event from sqs
const event = require('./event.json')
// mock data from dynamodb
const { transcription, region } = require('./mock-data')

describe('handler()', function () {
  beforeEach(function () {
    // Set up environment variables for tests
    process.env.ENV = 'test'
    process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME = 'Transcription-test'
    process.env.API_KIYANAW_REGIONTABLE_NAME = 'Region-test'
  })
  
  afterEach(function () {
    sinon.restore()
    delete process.env.ENV
    delete process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
  })

  it('should return if there are no records', async function () {
    const dbStub = sinon.stub(dynamo, 'getDoc')

    const newEvent = { Records: [] }
    const result = await handler(newEvent)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(dbStub.called === false)
  })

  it('should return if loading the region fails', async function () {
    const dbStub = sinon.stub(dynamo, 'getDoc').onFirstCall().rejects(new Error('some error'))
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // check that it used the appropriate region ID
    assert.deepEqual(dbStub.args[0][0], {
      Key: {
        id: 'wavesurfer_72hcq2e2q88',
      },
      TableName: 'Region-test',
    })

    assert.equal(dbStub.callCount, 1)
  })

  it('should clean up search index when region is not found (deleted)', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion').resolves({ deleted: 5 })
    const dbStub = sinon.stub(dynamo, 'getDoc').onFirstCall().resolves(null) // Region not found
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // check that it used the appropriate region ID
    assert.deepEqual(dbStub.args[0][0], {
      Key: {
        id: 'wavesurfer_72hcq2e2q88',
      },
      TableName: 'Region-test',
    })

    // search cleanup should be called with the region ID
    assert.ok(searchStub.called)
    assert.equal(searchStub.args[0][0], 'wavesurfer_72hcq2e2q88')
    assert.equal(dbStub.callCount, 1)
  })

  it('should return if loading the transcription fails', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const dbStub = sinon
      .stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .rejects(new Error('some other error'))
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // check that it used the appropriate region ID
    assert.deepEqual(dbStub.args[1][0], {
      Key: {
        id: '73150c90',
      },
      TableName: 'Transcription-test',
    })

    assert(searchStub.called === false)
  })

  it('should bail if the transcription is private', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const privateTranscription = {
      Item: {
        ...transcription.Item,
        isPrivate: true,
      },
    }
    const dbStub = sinon
      .stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(privateTranscription)
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // delete should not be called
    assert.ok(!searchStub.called)
  })

  it('should bail if the transcription has no lang set', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const transcriptionWithoutLang = {
      Item: {
        ...transcription.Item,
        lang: null,
      },
    }
    const dbStub = sinon
      .stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcriptionWithoutLang)
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // delete should not be called
    assert.ok(!searchStub.called)
  })

  it('should delete all entries for a region then index', async function () {
    const deleteStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const indexStub = sinon.stub(search, 'indexRegionAnalysis')
    const dbStub = sinon
      .stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcription)
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // delete should not be called
    sinon.assert.callOrder(deleteStub, indexStub)
  })
})
