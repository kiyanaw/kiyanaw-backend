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
  afterEach(function () {
    sinon.restore()
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
      TableName: 'Region-2f6oi2uymzaunf4rb564agznt4-prod',
    })

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
      TableName: 'Transcription-2f6oi2uymzaunf4rb564agznt4-prod',
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

  it('should bail if the transcription analyzer disabled', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const privateTranscription = {
      Item: {
        ...transcription.Item,
        disableAnalyzer: true,
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

  it('should delete all entries for a region then index', async function () {
    const deleteStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const indexStub = sinon.stub(search, 'indexKnownWords')
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
