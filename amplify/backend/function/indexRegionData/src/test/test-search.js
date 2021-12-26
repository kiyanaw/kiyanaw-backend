const assert = require('assert')
const sinon = require('sinon')

const search = require('../lib/search')
const sapir = require('../lib/sapir')
const { client } = require('../lib/es')
const rawRegion = require('./mock-data').region
const region = rawRegion.Item

describe('search.clearKnownWordsForRegion()', function () {
  it('should run a delete query for region', async function () {
    const deleteStub = sinon.stub(client, 'deleteByQuery').resolves('whatever')

    const response = await search.clearKnownWordsForRegion('some-region-id')

    assert.ok(deleteStub.called)

    assert.deepEqual(deleteStub.args[0][0], {
      index: 'knownwords',
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

describe('search.indexKnownWords()', function () {
  afterEach(function () {
    sinon.restore()
  })
  it('should not index if no results from sapir', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results: [] } })
    const searchStub = sinon.stub(client, 'update')

    await search.indexKnownWords(region)

    assert.equal(sapirStub.args[0][0], 'tânisi')
    assert.ok(!searchStub.called)
  })

  it('should call sapir for each known word', async function () {
    const sapirStub = sinon.stub(sapir, 'clickInText').resolves({ data: { results: [] } })
    const searchStub = sinon.stub(client, 'update')

    const regionWithTwoKnownWords = {
      ...region,
      text: JSON.stringify([
        { attributes: { 'known-word': 'true' }, insert: 'tānisi' },
        { insert: ' ' },
        { attributes: { 'known-word': 'true' }, insert: 'nitisiyihkâson' },
        { attributes: { garbage: 'true' }, insert: 'foobar' },
      ]),
    }

    await search.indexKnownWords(regionWithTwoKnownWords)

    assert.equal(sapirStub.callCount, 2)
    assert.equal(sapirStub.args[0][0], 'tânisi')
    assert.equal(sapirStub.args[1][0], 'nitisiyihkâson')
    assert.ok(!searchStub.called)
  })

  it('should call sapir for each known word', async function () {
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

    await search.indexKnownWords(region)

    assert.equal(sapirStub.callCount, 1)
    assert.equal(sapirStub.args[0][0], 'tânisi')

    assert.equal(searchStub.callCount, 1)
    assert.deepEqual(searchStub.args[0][0], {
      index: 'knownwords',
      type: '_doc',
      id: `wavesurfer_72hcq2e2q88-tânisi`,
      body: {
        doc: {
          lemma: 'some lemma',
          surface: 'tânisi',
          transcriptionId: '73150c90',
          regionId: 'wavesurfer_72hcq2e2q88',
          regionText: 'tânisi k-isi-nôcihtâcik pê-pimâtisiwin \n',
          wordType: 'some type',
          wordClass: 'some word class',
        },
        doc_as_upsert: true,
      },
    })
  })
})
