const assert = require('assert')
const sinon = require('sinon')

const DataStore = require('aws-amplify').DataStore
const { Transcription } = require('../../src/models')

const UserService = require('../../src/services/user').default
const store = require('../../src/store/transcription').default
const models = require('../../src/store/models').default

const mockTranscriptions = require('./transcriptions.json').transcriptions

const pause = function (duration = 1) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

describe('Transcription store', function () {

  beforeEach(function () {
    this.sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  describe('actions.loadTranscriptions()', function () {
    it('should initialize and query transcriptions based on the user profile', async function () {
      const userStub = this.sandbox.stub(UserService, 'getProfile').resolves({username: 'someuser'})

      // mock transcriptions need a shim for the async contributors loading
      mockTranscriptions.forEach((item) => {
        item.contributors = { toArray: this.sandbox.stub().resolves([])}
      })
      const queryStub = this.sandbox.stub(DataStore, 'query').resolves(mockTranscriptions)
      const actionsStub = this.sandbox.stub(store.actions, 'initForLoading').resolves()

      const mockStore = {
        commit: this.sandbox.stub(),
        dispatch: this.sandbox.stub(),
      }

      await store.actions.loadTranscriptions(mockStore)
      // init was called
      assert.ok(actionsStub.called)
      assert.equal(queryStub.args[0][0], Transcription)

      // getProfile was called
      assert.ok(userStub.called)

      // transcriptions were set on the store
      assert.ok(mockStore.dispatch.called)
      assert.equal(mockStore.dispatch.args[0][0], 'setTranscriptions')
      const transcriptions = mockStore.dispatch.args[0][1]
      assert.equal(transcriptions.length, 3)

      // assert a few details about the model
      const first = transcriptions[0]
      assert.ok(first instanceof models.TranscriptionModel)
      assert.equal(first.id, '8ce52730')
    })
  })

  describe('actions.loadTranscription()', function () {
    it('should throw an error if store not provided', async function () {
      await assert.rejects(store.actions.loadTranscription, {
        name: 'AssertionError',
        message: 'store must be provided'
      })
    })
    
    it('should throw an error if transcriptionId not provided', async function () {
      await assert.rejects(() => {
        return store.actions.loadTranscription(true)
      }, {
        name: 'AssertionError',
        message: 'transcriptionId must be provided',
      })
    })

    it('should call DataStore with the transcriptionId', async function () {
      const actionsStub = this.sandbox.stub(store.actions, 'onLoadTranscription').resolves()
      const stub = this.sandbox.stub(DataStore, 'query')

      const transcriptionData = mockTranscriptions[0]
      transcriptionData.contributors = {
        toArray: this.sandbox.stub().resolves([{ contributorID: 'testuser', }]),
      }
      stub.onCall(0).resolves(transcriptionData)
      stub.onCall(1).resolves([
        {
          id: 'one',
          comments: '[]',
          text: '{}',
          issues: '[]',
        },
        {
          id: 'one',
          comments: '[]',
          text: '{}',
          issues: '[]',
        },
      ])

      store.actions.loadTranscription({}, '1234abc')

      // this set of assertions makes sure that the callback is called
      await pause()
      // this set of assertions makes sure the DataStore.query() is called
      assert.ok(stub.args[0][0] === Transcription)
      assert.equal(stub.args[0][1], '1234abc')
      assert.equal(actionsStub.callCount, 1)

      // check that everything was instantiated
      const loadArgs = actionsStub.args
      assert.ok(loadArgs[0][1] instanceof models.TranscriptionModel)
      assert.ok(loadArgs[0][2][0] instanceof models.RegionModel)
      assert.equal(loadArgs[0][2][0].id, 'one')

    })
  })

  describe('actions.onLoadTranscription()', function () {
    it('should throw an error if store not provided', async function () {
      await assert.rejects(() => {
        return store.actions.onLoadTranscription()
      }, {
        name: 'AssertionError', 
        message: 'store must be provided'
      })
    })

    it('should throw an error if transcription not provided', async function () {
      await assert.rejects(() => {
        return store.actions.onLoadTranscription(true)
      }, {
        name: 'AssertionError', 
        message: 'transcription must be provided'
      })
    })

    it('should throw an error if regions not provided')

    it('should load peaks and set the transcription data', async function () {
      
    })
  })
})
