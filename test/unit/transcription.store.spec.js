const assert = require('assert')
const sinon = require('sinon')

const DataStore = require('aws-amplify').DataStore
const { Transcription, Region } = require('../../src/models')

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
      this.sandbox.stub(store.actions, 'onTranscriptionSubscription')
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

    it('should throw an error if regions not provided', async function () {
      await assert.rejects(
        () => {
          return store.actions.onLoadTranscription(true, true)
        },
        {
          name: 'AssertionError',
          message: 'regions must be provided',
        },
      )
    })

    it('should load & dispatch data, and set subscriptions', async function () {
      const subscribe = this.sandbox.stub()
      const observe = this.sandbox.stub(DataStore, 'observe').returns({subscribe})
      const observeQuery = this.sandbox.stub(DataStore, 'observeQuery').returns({ subscribe })
      const peaksStub = this.sandbox.stub(store.actions, 'loadPeaksData').resolves('peaks-data')
      store.dispatch = this.sandbox.stub()

      const transcription = { title: 'foo', source: '1234', id: '123' }
      const regions = [{ some: 'region' }]
      await store.actions.onLoadTranscription(store, transcription, regions)

      // loads peaks data
      assert.equal(peaksStub.args[0][1], '1234')

      // sets transcription & regions on the store
      assert.equal(store.dispatch.callCount, 2)
      assert.equal(store.dispatch.args[0][0], 'setTranscription')
      assert.deepEqual(store.dispatch.args[0][1], transcription)
      assert.equal(store.dispatch.args[1][0], 'setRegions')
      assert.deepEqual(store.dispatch.args[1][1], regions)

      // sets up subscriptions
      assert.deepEqual(observe.args[0], [Transcription, '123'])
      assert.equal(observeQuery.args[0][0], Region)
      assert.equal(subscribe.callCount, 2)
    })
  })

  describe('actions.onTranscriptionSubscription', function () {
    it('should update the transcription with remote update', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'Joe' })
      store.commit = this.sandbox.stub()
      const incoming = { userLastUpdated: 'Jane', title: 'foo' }
      // call the handler
      await store.actions.onTranscriptionSubscription(store, {
        opType: 'UPDATE',
        element: incoming
      })
      assert.ok(store.commit.called)
      assert.deepEqual(store.commit.args[0], ['UPDATE_TRANSCRIPTION', incoming])
    })

    it('should NOT update the transcription with remote update', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'Jane' })
      store.commit = this.sandbox.stub()
      const incoming = { userLastUpdated: 'Jane', title: 'foo' }
      // call the handler
      await store.actions.onTranscriptionSubscription(store, {
        opType: 'UPDATE',
        element: incoming,
      })
      assert.equal(store.commit.callCount, 0)
    })

    it('should handle delete subscription')
  })

  describe('actions.onRegionSubscription', function () {

    beforeEach(function () {
      this.snapshot = {
        items: [
          {
            id: 'one',
            start: 1,
            end: 2,
            text: '[]',
            issues: null,
            isNote: null,
            comments: null,
            translation: null,
            dateLastUpdated: '1000',
            userLastUpdated: 'aaronfay',
            createdAt: '2023-02-08T22:09:41.705Z',
            updatedAt: '2023-02-08T22:09:41.705Z',
            _version: 1,
            _lastChangedAt: 1675894181728,
            _deleted: null,
            transcriptionId: '8ce52730',
          },
          {
            id: 'two',
            start: 3,
            end: 4,
            text: '[]',
            issues: null,
            isNote: null,
            comments: null,
            translation: null,
            dateLastUpdated: '1000',
            userLastUpdated: 'aaronfay',
            createdAt: '2023-02-08T22:26:13.607Z',
            updatedAt: '2023-02-08T22:26:13.607Z',
            _version: 1,
            _lastChangedAt: 1675895173639,
            _deleted: null,
            transcriptionId: '8ce52730',
          },
          {
            id: 'three',
            start: 5,
            end: 6,
            text: '[]',
            issues: null,
            isNote: null,
            comments: null,
            translation: null,
            dateLastUpdated: '1000',
            userLastUpdated: 'aaronfay',
            createdAt: '2023-02-08T23:04:44.700Z',
            updatedAt: '2023-02-09T01:01:29.037Z',
            _version: 10,
            _lastChangedAt: 1675904489083,
            _deleted: null,
            transcriptionId: '8ce52730',
          },
        ],
        isSynced: true,
      }

    })

    it('should not process local messages', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'janedoe' })
      store.commit = this.sandbox.stub()
      store.getters.regionById = this.sandbox.stub()

      // set incoming message to the current user
      this.snapshot.items[2].userLastUpdated = 'janedoe'
      this.snapshot.items[2].dateLastUpdated = `${+ new Date() + 1000}`

      await store.actions.onRegionSubscription(store, { ...this.snapshot })
      assert.equal(store.getters.regionById.callCount, 0)
    })

    it('should not process past messages', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'janedoe' })
      store.commit = this.sandbox.stub()
      store.getters.regionById = this.sandbox.stub()
      const setTimestampStub = this.sandbox.stub(store.actions, 'setLastRegionUpdate')

      // set incoming to other user
      this.snapshot.items[2].userLastUpdated = 'fooboo'
      await store.actions.onRegionSubscription(store, { ...this.snapshot })
      assert.equal(store.getters.regionById.callCount, 0)
      assert.equal(setTimestampStub.callCount, 0)
    })

    it('should process remote, future messages', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'janedoe' })
      store.commit = this.sandbox.stub()
      store.getters.regionById = this.sandbox.stub()
      // set incoming message to the current user, & in the future
      this.snapshot.items[2].userLastUpdated = 'fooboo'
      this.snapshot.items[2].dateLastUpdated = `${+new Date() + 1000}`
      
      await store.actions.onRegionSubscription(store, { ...this.snapshot })
      assert.equal(store.getters.regionById.callCount, 1)
    })

    /**
     * Makes sure that the incoming region is processed correctly.
     */
    it('should update an existing region  from remote messages', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'janedoe' })
      store.dispatch = this.sandbox.stub()
      const setTimestampStub = this.sandbox.stub(store.actions, 'setLastRegionUpdate')

      // set existing local region
      const existing = {
        ...this.snapshot.items[1],
        dateLastUpdated: '1675894181000',
        displayIndex: 2,
        index: 1,
      }
      store.getters.regionById = this.sandbox.stub().returns(existing)

      // tweak incoming update
      this.snapshot.items[2].userLastUpdated = 'fooboo'
      this.snapshot.items[2].dateLastUpdated = `${+new Date() + 10000}`
      await store.actions.onRegionSubscription(store, { ...this.snapshot })

      // gets the local region based on remote id
      assert.equal(store.getters.regionById.args[0][0], 'three')
      // updated region should be committed
      assert.equal(store.dispatch.callCount, 1)
      assert.equal(store.dispatch.args[0][0], 'commitRegionUpdate')
      assert.deepEqual(store.dispatch.args[0][1].region, existing)
      assert.deepEqual(store.dispatch.args[0][1].update, {
        comments: [],
        createdAt: '2023-02-08T23:04:44.700Z',
        dateLastUpdated: this.snapshot.items[2].dateLastUpdated,
        end: 6,
        id: 'three',
        isNote: false,
        issues: [],
        start: 5,
        text: [],
        transcriptionId: '8ce52730',
        translation: null,
        userLastUpdated: 'fooboo',
      })
      // // ensure index & displayIndex are not in the update
      assert.equal(store.dispatch.args[0][1].update.index, undefined)
      assert.equal(store.dispatch.args[0][1].update.displayIndex, undefined)

      // make sure the intenal value for LAST_REGION_UPDATE was recorded
      assert.equal(setTimestampStub.callCount, 1)
      assert.equal(setTimestampStub.args[0][0], this.snapshot.items[2].dateLastUpdated)
    })

    it('should create a new region from remote messages', async function () {
      this.sandbox.stub(UserService, 'getUser').resolves({ name: 'janedoe' })
      store.dispatch = this.sandbox.stub()
      const setTimestampStub = this.sandbox.stub(store.actions, 'setLastRegionUpdate')

      // new incoming region
      const incoming = {
        id: 'four',
        start: 5,
        end: 6,
        text: '[]',
        issues: null,
        isNote: null,
        comments: null,
        translation: null,
        dateLastUpdated: `${+new Date() + 1000}`,
        userLastUpdated: 'foo',
        createdAt: '2023-02-08T23:04:44.700Z',
        updatedAt: '2023-02-09T01:01:29.037Z',
        transcriptionId: '8ce52730',
      }
      store.getters.regionById = this.sandbox.stub().returns(null)
      await store.actions.onRegionSubscription(store, { items: [incoming]  })

      // updated region should be committed
      assert.equal(store.dispatch.callCount, 1)
      assert.equal(store.dispatch.args[0][0], 'commitRegionAdd')
      assert.equal(store.dispatch.args[0][1].id, 'four')
      assert.equal(store.dispatch.args[0][1].start, 5)
      assert.equal(store.dispatch.args[0][1].end, 6)
      assert.equal(store.dispatch.args[0][1].translation, null)
      assert.equal(store.dispatch.args[0][1].dateLastUpdated, incoming.dateLastUpdated)
      assert.equal(store.dispatch.args[0][1].userLastUpdated, 'foo')
      assert.equal(store.dispatch.args[0][1].transcriptionId, '8ce52730')
      // these fields are parsed
      assert.equal(store.dispatch.args[0][1].isNote, false)
      assert.deepEqual(store.dispatch.args[0][1].text, [])
      assert.deepEqual(store.dispatch.args[0][1].issues, [])
      assert.deepEqual(store.dispatch.args[0][1].comments, [])

      // // ensure index & displayIndex are not in the update
      assert.equal(store.dispatch.args[0][1].index, undefined)
      assert.equal(store.dispatch.args[0][1].displayIndex, undefined)

      // make sure the intenal value for LAST_REGION_UPDATE was recorded
      assert.equal(setTimestampStub.callCount, 1)
      assert.equal(setTimestampStub.args[0][0], incoming.dateLastUpdated)
    })

  })
})
