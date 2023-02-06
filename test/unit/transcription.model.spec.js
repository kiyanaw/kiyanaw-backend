const assert = require('assert')
const sinon = require('sinon')

const models = require('../../src/store/models').default
const mockTranscriptions = require('./transcriptions.json').transcriptions

const pause = function (duration = 1) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

describe('Transcription model', function () {

  beforeEach(function () {
    this.sandbox = sinon.createSandbox()
    this.transcriptionData = mockTranscriptions[0]
    this.transcriptionData.contributors = {
      toArray: this.sandbox.stub().resolves([
        {
          contributorID: 'testuser',
        },
        {
          contributorID: 'otheruser',
        },
      ]),
    }
  })

  afterEach(function () {
    this.sandbox.restore()
  })


  it('should instantiate', async function () {
    const transcription = new models.TranscriptionModel(this.transcriptionData)

    // need a few seconds to let contributors sync up
    await pause()

    assert.equal(transcription.id, '8ce52730')
    assert.equal(transcription.author, 'aaronfay')
    assert.equal(transcription.coverage, 0)
    assert.equal(transcription.dateLastUpdated, '1576648767779')
    assert.equal(transcription.userLastUpdated, 'aaronfay')
    assert.equal(transcription.issues, 0)
    assert.equal(transcription.comments, null)
    assert.equal(transcription.tags, null)
    assert.equal(
      transcription.source,
      'https://kiyanawb9b0a37496e34efd8156e27ad4220e33-dev.s3.amazonaws.com/public/1576648760318-test.mp3',
    )
    assert.equal(transcription.index, null)
    assert.equal(transcription.title, 'Test audio 001')
    assert.equal(transcription.type, 'video/mp4')
    assert.equal(transcription.isPrivate, false)
    assert.equal(transcription.disableAnalyzer, false)
    assert.equal(transcription.isVideo, true)
    assert.equal(transcription.peaksData, null)

    // dynamic properties
    assert.equal(transcription.url, '/transcribe-edit/8ce52730')
    assert.equal(transcription.length, '14:10')
    assert.deepEqual(transcription.editors, ['testuser', 'otheruser'])
  })

  it('should set peaksData', async function () {
    const transcription = new models.TranscriptionModel(this.transcriptionData)
    assert.equal(transcription.peaksData, null)
    transcription.peaks = 'new-peaks-data'
    // getter
    assert.equal(transcription.peaks, 'new-peaks-data')
    assert.equal(transcription.peaksData, 'new-peaks-data')
  })
})