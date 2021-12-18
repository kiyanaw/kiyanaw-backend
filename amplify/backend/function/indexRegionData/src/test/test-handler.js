const assert = require('assert').strict
const sinon = require('sinon')

const handler = require('../index').handler
const db = require('../lib/aws')
const event = require('./event.json')

const transcription = {
  Item: {
    __typename: 'Transcription',
    isPrivate: false,
    coverage: 0,
    issues: '0',
    createdAt: '2021-10-06T16:12:41.080Z',
    source:
      'https://kiyanawb9b0a37496e34efd8156e27ad4220e33-prod.s3.amazonaws.com/public/1633536641091-Francis-McAdam-Big-River-First-Nation.mp4',
    disableAnalyzer: false,
    dateLastUpdated: '1639342736996',
    length: 0,
    updatedAt: '2021-12-12T20:58:57.336Z',
    id: '3af0aaf0',
    author: 'aaronfay',
    contributors: '[]',
    title: 'YT - Francis McAdam',
    type: 'video/mp4',
    userLastUpdated: 'aaronfay',
  },
}

describe('handler()', function () {
  afterEach(function () {
    sinon.restore()
  })

  it('should return if there are no records', async function () {
    const dbStub = sinon.stub(db, 'getDoc')

    const newEvent = { Records: [] }
    const result = await handler(newEvent)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!dbStub.called)
  })

  it('should return if there is no new record', async function () {
    const dbStub = sinon.stub(db, 'getDoc')

    const newEvent = { Records: [{ dynamodb: {} }] }
    const result = await handler(newEvent)

    assert.equal(result.body, '{"message": "ok"}')
    assert.ok(!dbStub.called)
  })

  // it('should bail if the transcription is private', async function () {
  //   const dbStub = sinon.stub(db, 'getDoc')

  //   const result = await handler(event)

  //   assert.equal(result.body, '{"message": "ok"}')
  //   assert.ok(!dbStub.called)
  // })

  it.only('should index an item for each word', async function () {
    this.timeout(10000)
    const dbStub = sinon.stub(db, 'getDoc').resolves(transcription)

    const result = await handler(event)

    assert.equal(result.body, '{"message": "ok"}')
  })
})
