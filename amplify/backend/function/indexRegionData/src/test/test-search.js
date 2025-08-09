const assert = require('assert')
const sinon = require('sinon')

const search = require('../lib/search')
const sapir = require('../lib/sapir')
const { client } = require('../lib/es')
const mockData = require('./mock-data')
const region = mockData.region.Item
const transcription = mockData.transcription.Item

describe('search.clearKnownWordsForRegion()', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.ENV = 'test'
  })
  
  afterEach(function () {
    delete process.env.ENV
  })
  
  it('should run a delete query for region', async function () {
    const deleteStub = sinon.stub(client, 'deleteByQuery').resolves('whatever')

    const response = await search.clearKnownWordsForRegion('some-region-id')

    assert.ok(deleteStub.called)

    assert.deepEqual(deleteStub.args[0][0], {
      index: 'knownwords-test',
      type: '_doc',
      body: {
        query: {
          match: { regionId: 'some-region-id' },
        },
      },
    })

    assert.equal(response, 'whatever')
  })
})

describe('search.indexRegionAnalysis()', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.ENV = 'test'
  })
  
  afterEach(function () {
    sinon.restore()
    delete process.env.ENV
  })
  
  it('should skip indexing if transcription has no language index', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText')
    const searchStub = sinon.stub(client, 'update')
    
    const transcriptionWithoutIndex = {
      Item: {
        ...transcription.Item,
        index: null
      }
    }

    await search.indexRegionAnalysis(region.Item, transcriptionWithoutIndex.Item)

    assert.ok(!sapirStub.called)
    assert.ok(!searchStub.called)
  })

  it('should skip indexing if region has no regionAnalysis', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText')
    const searchStub = sinon.stub(client, 'update')
    
    const regionWithoutAnalysis = {
      ...region,
      regionAnalysis: []
    }

    await search.indexRegionAnalysis(regionWithoutAnalysis, transcription)

    assert.ok(!sapirStub.called)
    assert.ok(!searchStub.called)
  })

  it('should not index if no results from sapir', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results: [] } })
    const searchStub = sinon.stub(client, 'update')

    await search.indexRegionAnalysis(region, transcription)

    assert.equal(sapirStub.args[0][0], 'tânisi')
    assert.ok(!searchStub.called)
  })

  it('should call sapir for each word in regionAnalysis', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results: [] } })
    const searchStub = sinon.stub(client, 'update')

    const regionWithTwoWords = {
      ...region,
      regionAnalysis: ['tānisi', 'nitisiyihkâson']
    }

    await search.indexRegionAnalysis(regionWithTwoWords, transcription)

    assert.equal(sapirStub.callCount, 2)
    assert.equal(sapirStub.args[0][0], 'tânisi')
    assert.equal(sapirStub.args[1][0], 'nitisiyihkâson')
    assert.ok(!searchStub.called)
  })

  it('should index words with transcription language', async function () {
    const results = [
      {
        lemma_wordform: {
          text: 'some lemma',
          pos: 'some type',
          wordclass: 'some word class',
        },
      },
    ]
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results } })
    const searchStub = sinon.stub(client, 'update').resolves({
      result: 'created',
    })

    await search.indexRegionAnalysis(region, transcription)

    assert.equal(sapirStub.callCount, 1)
    assert.equal(sapirStub.args[0][0], 'tânisi')

    assert.equal(searchStub.callCount, 1)
    assert.deepEqual(searchStub.args[0][0], {
      index: 'knownwords-test',
      type: '_doc',
      id: `wavesurfer_72hcq2e2q88-tânisi`,
      body: {
        doc: {
          lang: 'crk', // Should use transcription.index instead of hardcoded 'crk'
          lemma: 'some lemma',
          surface: 'tânisi',
          timestamp: '211.69267466560015:214.74777862951606',
          transcriptionId: '73150c90',
          transcriptionName: 'YT - Francis McAdam',
          regionId: 'wavesurfer_72hcq2e2q88',
          regionText: 'tânisi k-isi-nôcihtâcik pê-pimâtisiwin \n',
          wordType: 'some type',
          wordClass: 'some word class',
        },
        doc_as_upsert: true,
      },
    })
  })

  it('should use different language index when transcription index is crgn', async function () {
    const results = [
      {
        lemma_wordform: {
          text: 'northern michif lemma',
          pos: 'noun',
          wordclass: 'animate',
        },
      },
    ]
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results } })
    const searchStub = sinon.stub(client, 'update').resolves({
      result: 'created',
    })

    const transcriptionWithCrgn = {
      ...transcription,
      index: 'crgn'
    }

    await search.indexRegionAnalysis(region, transcriptionWithCrgn)

    assert.equal(searchStub.callCount, 1)
    assert.equal(searchStub.args[0][0].body.doc.lang, 'crgn')
  })
})
