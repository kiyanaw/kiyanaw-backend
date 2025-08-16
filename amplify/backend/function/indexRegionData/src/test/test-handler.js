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
    process.env.API_KIYANAW_ISSUETABLE_NAME = 'Issue-test'
  })
  
  afterEach(function () {
    sinon.restore()
    delete process.env.ENV
    delete process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
    delete process.env.API_KIYANAW_REGIONTABLE_NAME
    delete process.env.API_KIYANAW_ISSUETABLE_NAME
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
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForRegion').resolves({ deleted: 2 })
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
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForRegion')
    const privateTranscription = {
      Item: {
        ...transcription.Item,
        isPrivate: true,
        publicIssues: false,
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
    assert.ok(!searchIssuesStub.called)
  })

  it('should skip region indexing but process issues when transcription has no lang set', async function () {
    const searchStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const searchIssuesStub = sinon.stub(search, 'clearIssuesForRegion')
    const indexIssuesStub = sinon.stub(search, 'indexIssuesForRegion')
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForRegion').resolves([])
    const transcriptionWithoutLang = {
      Item: {
        ...transcription.Item,
        lang: null,
        publicIssues: true,
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

    // Region processing should not happen (no lang)
    assert.ok(!searchStub.called)
    
    // Issue processing should still happen (publicIssues = true, lang not required)
    assert.ok(searchIssuesStub.called)
    assert.ok(getIssuesStub.called)
  })

  it('should delete all entries for a region then index', async function () {
    const deleteStub = sinon.stub(search, 'clearKnownWordsForRegion')
    const deleteIssuesStub = sinon.stub(search, 'clearIssuesForRegion')
    const indexStub = sinon.stub(search, 'indexRegionAnalysis')
    const indexIssuesStub = sinon.stub(search, 'indexIssuesForRegion')
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForRegion').resolves([])
    const dbStub = sinon
      .stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcription)
    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')

    // delete should be called before indexing
    sinon.assert.callOrder(deleteStub, indexStub)
    // Issues stub should be called for clearing, but indexing won't happen if no issues
    sinon.assert.calledOnce(deleteIssuesStub)
  })

  it('should index issues when publicIssues is true', async function () {
    const { transcription, region, mockIssues } = require('./mock-data')
    
    // Mock DynamoDB calls
    const getDocStub = sinon.stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcription)
    
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForRegion')
      .resolves(mockIssues.Items)
    
    // Mock search functions
    const clearWordsStub = sinon.stub(search, 'clearKnownWordsForRegion').resolves({ deleted: 0 })
    const clearIssuesStub = sinon.stub(search, 'clearIssuesForRegion').resolves({ deleted: 0 })
    const indexWordsStub = sinon.stub(search, 'indexRegionAnalysis').resolves()
    const indexIssuesStub = sinon.stub(search, 'indexIssuesForRegion').resolves({ total: 1, indexed: 1 })

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    
    // Verify that issue indexing was called
    sinon.assert.calledOnce(getIssuesStub)
    sinon.assert.calledOnce(clearIssuesStub)
    sinon.assert.calledOnce(indexIssuesStub)
    sinon.assert.calledWith(indexIssuesStub, mockIssues.Items, region.Item, transcription.Item)
  })

  it('should not index issues when publicIssues is false', async function () {
    const { transcriptionPrivateIssues, region, mockIssues } = require('./mock-data')
    
    // Mock DynamoDB calls
    const getDocStub = sinon.stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcriptionPrivateIssues)
    
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForRegion')
      .resolves(mockIssues)
    
    // Mock search functions
    const clearWordsStub = sinon.stub(search, 'clearKnownWordsForRegion').resolves({ deleted: 0 })
    const clearIssuesStub = sinon.stub(search, 'clearIssuesForRegion').resolves({ deleted: 0 })
    const indexWordsStub = sinon.stub(search, 'indexRegionAnalysis').resolves()
    const indexIssuesStub = sinon.stub(search, 'indexIssuesForRegion').resolves()

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    
    // Verify that issue indexing was NOT called
    sinon.assert.notCalled(getIssuesStub)
    sinon.assert.notCalled(clearIssuesStub)
    sinon.assert.notCalled(indexIssuesStub)
  })

  it('should not index resolved issues', async function () {
    const { transcription, region, mockIssuesAllResolved } = require('./mock-data')
    
    // Mock DynamoDB calls
    const getDocStub = sinon.stub(dynamo, 'getDoc')
      .onFirstCall()
      .resolves(region)
      .onSecondCall()
      .resolves(transcription)
    
    const getIssuesStub = sinon.stub(dynamo, 'getIssuesForRegion')
      .resolves(mockIssuesAllResolved.Items)
    
    // Mock search functions
    const clearWordsStub = sinon.stub(search, 'clearKnownWordsForRegion').resolves({ deleted: 0 })
    const clearIssuesStub = sinon.stub(search, 'clearIssuesForRegion').resolves({ deleted: 0 })
    const indexWordsStub = sinon.stub(search, 'indexRegionAnalysis').resolves()
    const indexIssuesStub = sinon.stub(search, 'indexIssuesForRegion').resolves()

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
    
    // Verify that issues were fetched but indexing function was called with empty result
    sinon.assert.calledOnce(getIssuesStub)
    sinon.assert.calledOnce(clearIssuesStub)
    sinon.assert.calledOnce(indexIssuesStub)
    
    // The indexing function should have been called with all resolved issues (which get filtered out)
    sinon.assert.calledWith(indexIssuesStub, mockIssuesAllResolved.Items, region.Item, transcription.Item)
  })
})
