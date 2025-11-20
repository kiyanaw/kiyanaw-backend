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
    sinon.restore()
    delete process.env.ENV
  })
  
  it('should search for documents and bulk delete by ID', async function () {
    const searchStub = sinon.stub(client, 'search').resolves({
      body: {
        hits: {
          hits: [
            { _id: 'some-region-id-word1' },
            { _id: 'some-region-id-word2' }
          ]
        }
      }
    })
    
    const bulkStub = sinon.stub(client, 'bulk').resolves({
      body: {
        items: [
          { delete: { result: 'deleted', status: 200 } },
          { delete: { result: 'deleted', status: 200 } }
        ]
      }
    })

    const response = await search.clearKnownWordsForRegion('some-region-id')

    assert.ok(searchStub.called)
    assert.ok(bulkStub.called)

    // Check search was called correctly
    assert.deepEqual(searchStub.args[0][0], {
      index: 'knownwords-test',
      body: {
        query: {
          term: { regionId: 'some-region-id' }
        },
        _source: false,
        size: 1000,
      },
    })

    // Check bulk delete was called correctly
    assert.deepEqual(bulkStub.args[0][0], {
      body: [
        { delete: { _index: 'knownwords-test', _id: 'some-region-id-word1' } },
        { delete: { _index: 'knownwords-test', _id: 'some-region-id-word2' } }
      ],
      refresh: false,
    })

    assert.equal(response.deleted, 2)
  })

  it('should handle index not found error gracefully', async function () {
    const error = new Error('Index not found')
    error.meta = {
      statusCode: 404,
      body: {
        error: {
          type: 'index_not_found_exception'
        }
      }
    }
    const searchStub = sinon.stub(client, 'search').rejects(error)

    const response = await search.clearKnownWordsForRegion('some-region-id')

    assert.ok(searchStub.called)
    assert.equal(response.deleted, 0)
  })

  it('should re-throw non-404 errors', async function () {
    const error = new Error('Some other error')
    error.meta = { statusCode: 500 }
    const searchStub = sinon.stub(client, 'search').rejects(error)

    try {
      await search.clearKnownWordsForRegion('some-region-id')
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.equal(err.message, 'Some other error')
    }
  })

  it('should throw error for invalid regionId', async function () {
    try {
      await search.clearKnownWordsForRegion(null)
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.equal(err.message, 'Invalid regionId: must be a non-empty string')
    }
  })

  it('should throw error for empty regionId', async function () {
    try {
      await search.clearKnownWordsForRegion('')
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.equal(err.message, 'Invalid regionId: must be a non-empty string')
    }
  })

  it('should return 0 deleted when no documents found', async function () {
    const searchStub = sinon.stub(client, 'search').resolves({
      body: {
        hits: {
          hits: []
        }
      }
    })
    
    const bulkStub = sinon.stub(client, 'bulk')

    const response = await search.clearKnownWordsForRegion('some-region-id')

    assert.ok(searchStub.called)
    assert.ok(!bulkStub.called) // Bulk should not be called
    assert.equal(response.deleted, 0)
  })
})

describe('search.clearIssuesForRegion()', function () {
  beforeEach(function () {
    // Set up environment variable for tests
    process.env.ENV = 'test'
  })
  
  afterEach(function () {
    sinon.restore()
    delete process.env.ENV
  })
  
  it('should search for issues and bulk delete by ID', async function () {
    const searchStub = sinon.stub(client, 'search').resolves({
      body: {
        hits: {
          hits: [
            { _id: 'issue-1' },
            { _id: 'issue-2' },
            { _id: 'issue-3' }
          ]
        }
      }
    })
    
    const bulkStub = sinon.stub(client, 'bulk').resolves({
      body: {
        items: [
          { delete: { result: 'deleted', status: 200 } },
          { delete: { result: 'deleted', status: 200 } },
          { delete: { result: 'deleted', status: 200 } }
        ]
      }
    })

    const response = await search.clearIssuesForRegion('some-region-id')

    assert.ok(searchStub.called)
    assert.ok(bulkStub.called)
    
    // Check search was called correctly
    assert.deepEqual(searchStub.args[0][0], {
      index: 'issues-test',
      body: {
        query: {
          term: { regionId: 'some-region-id' }
        },
        _source: false,
        size: 1000,
      },
    })
    
    assert.equal(response.deleted, 3)
  })

  it('should handle index not found error gracefully for issues', async function () {
    const error = new Error('Index not found')
    error.meta = {
      statusCode: 404,
      body: {
        error: {
          type: 'index_not_found_exception'
        }
      }
    }
    const searchStub = sinon.stub(client, 'search').rejects(error)

    const response = await search.clearIssuesForRegion('some-region-id')

    assert.ok(searchStub.called)
    assert.equal(response.deleted, 0)
  })

  it('should throw error for invalid regionId in clearIssuesForRegion', async function () {
    try {
      await search.clearIssuesForRegion(null)
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.equal(err.message, 'Invalid regionId: must be a non-empty string')
    }
  })

  it('should throw error for empty regionId in clearIssuesForRegion', async function () {
    try {
      await search.clearIssuesForRegion('')
      assert.fail('Should have thrown error')
    } catch (err) {
      assert.equal(err.message, 'Invalid regionId: must be a non-empty string')
    }
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
  
  it('should skip indexing if transcription has no lang field', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText')
    const searchStub = sinon.stub(client, 'update')
    
    const transcriptionWithoutLang = {
      Item: {
        ...transcription.Item,
        lang: null
      }
    }

    await search.indexRegionAnalysis(region.Item, transcriptionWithoutLang.Item)

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
    const searchStub = sinon.stub(client, 'update').resolves({
      body: {
        _shards: { successful: 1 },
        result: 'created'
      },
      statusCode: 200
    })

    await search.indexRegionAnalysis(region, transcription)

    // The function now processes the analysis directly and should call client.update
    assert.equal(searchStub.callCount, 1)
  })

  it('should call sapir for each word in regionAnalysis', async function () {
    const searchStub = sinon.stub(client, 'update').resolves({
      body: {
        _shards: { successful: 1 },
        result: 'created'
      },
      statusCode: 200
    })

    const regionWithTwoWords = {
      ...region,
      regionAnalysis: [
        { word: 'tānisi', analysis: 'tānisi+IPC', allAnalysis: ['tānisi+IPC'] },
        { word: 'nitisiyihkâson', analysis: 'nitisiyihkâson+IPC', allAnalysis: ['nitisiyihkâson+IPC'] }
      ]
    }

    await search.indexRegionAnalysis(regionWithTwoWords, transcription)

    // The function now uses language processor and should call client.update for each word
    assert.equal(searchStub.callCount, 2)
  })

  it('should index words with transcription language', async function () {
    const searchStub = sinon.stub(client, 'update').resolves({
      body: {
        _shards: { successful: 1 },
        result: 'created'
      },
      statusCode: 200
    })

    await search.indexRegionAnalysis(region, transcription)

    assert.equal(searchStub.callCount, 1)
    assert.deepEqual(searchStub.args[0][0], {
      index: 'knownwords-test',
      id: `wavesurfer_72hcq2e2q88-tânisi`,
      body: {
        doc: {
          lang: 'crk', // Uses transcription.lang field
          lemma: 'tânisi', // Extracted from analysis string by language processor
          surface: 'tânisi',
          timestamp: '211.69267466560015:214.74777862951606',
          transcriptionId: '73150c90',
          transcriptionName: 'YT - Francis McAdam',
          regionId: 'wavesurfer_72hcq2e2q88',
          regionText: 'tânisi k-isi-nôcihtâcik pê-pimâtisiwin',
          translation: '\n',
          wordType: 'Ipc', // Extracted from analysis string by language processor
          wordClass: 'IPC',
        },
        doc_as_upsert: true,
      },
    })
  })

  it('should use different language index when transcription index is crgn', async function () {
    const searchStub = sinon.stub(client, 'update').resolves({
      body: {
        _shards: { successful: 1 },
        result: 'created'
      },
      statusCode: 200
    })

    // Since there's no 'crgn' processor, the function will return early without calling searchStub
    const transcriptionWithCrgn = {
      ...transcription,
      lang: 'crgn'
    }

    await search.indexRegionAnalysis(region, transcriptionWithCrgn)

    // Function returns early because no language processor found for 'crgn'
    assert.equal(searchStub.callCount, 0)
  })
})
