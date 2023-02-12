const assert = require('assert')
const sinon = require('sinon')
const Timeout = require('smart-timeout')

const DataStore = require('aws-amplify').DataStore
const { Region } = require('../../src/models')

const UserService = require('../../src/services/user').default
const store = require('../../src/store/region').default
const models = require('../../src/store/models').default


const pause = function (duration = 1) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

describe('Region store', function () {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  describe('actions.updateRegionById', function () {
    it('should reject if update has no id', async function () {
      await assert.rejects(async () => {
        await store.actions.updateRegionById({}, {})
      }, {
        name: 'AssertionError',
        message: 'update.id must be provided',
      })
    })

    it('should add new region update to queue', async function () {
      const existing = {
        id: 'one',
        text: 'foo'
      }
      const getStub = this.sandbox.stub(store.getters, 'regionById').returns(existing)
      store.dispatch = this.sandbox.stub()

      // start with a fresh save intermediare
      assert.deepEqual(store.saveState.REGION_INTERMEDIARY, { id: null })
      await store.actions.updateRegionById(store, {
        id: 'one',
        text: 'bar',
        translation: 'foobar'
      })

      assert.ok(store.dispatch.callCount, 2)
      // commits local update for vuex
      assert.equal(store.dispatch.args[0][0], 'commitRegionUpdate')
      assert.deepEqual(store.dispatch.args[0][1], {
        region: existing,
        update: {
          id: 'one',
          text: 'bar',
          translation: 'foobar'
        }
      })
      // creates the intermediary "queue" object
      assert.deepEqual(store.saveState.REGION_INTERMEDIARY, {
        id: 'one',
        text: 'bar',
        translation: 'foobar',
      })
      // enqueues local save attempt
      assert.deepEqual(store.dispatch.args[1], ['enqueueRegionUpdate', 'one'])
    })

    it('should update existing region in the queue', async function () {
      const existing = {
        id: 'one',
        text: 'foo',
      }
      const getStub = this.sandbox.stub(store.getters, 'regionById').returns(existing)
      store.dispatch = this.sandbox.stub()

      // start with a fresh save intermediare
      // assert.deepEqual(store.saveState.REGION_INTERMEDIARY, { id: null })
      store.saveState.REGION_INTERMEDIARY = {
        id: 'one', 
        text: 'baz'
      }

      await store.actions.updateRegionById(store, {
        id: 'one',
        text: 'bar',
        translation: 'foobar',
      })

      assert.ok(store.dispatch.callCount, 2)
      // commits local update for vuex
      assert.equal(store.dispatch.args[0][0], 'commitRegionUpdate')
      assert.deepEqual(store.dispatch.args[0][1], {
        region: existing,
        update: {
          id: 'one',
          text: 'bar',
          translation: 'foobar',
        },
      })
      // creates the intermediary "queue" object
      assert.deepEqual(store.saveState.REGION_INTERMEDIARY, {
        id: 'one',
        text: 'bar',
        translation: 'foobar',
      })
      // enqueues local save attempt
      assert.deepEqual(store.dispatch.args[1], ['enqueueRegionUpdate', 'one'])
    })

    it('should overwrite the region in the queue', async function () {
      const existing = {
        id: 'two',
        text: 'fiz',
      }
      const getStub = this.sandbox.stub(store.getters, 'regionById').returns(existing)
      store.dispatch = this.sandbox.stub()

      // start with a fresh save intermediare
      // assert.deepEqual(store.saveState.REGION_INTERMEDIARY, { id: null })
      store.saveState.REGION_INTERMEDIARY = {
        id: 'one',
        text: 'baz',
      }

      await store.actions.updateRegionById(store, {
        id: 'two',
        text: 'bar',
        translation: 'foobar',
      })

      assert.ok(store.dispatch.callCount, 2)
      // commits local update for vuex
      assert.equal(store.dispatch.args[0][0], 'commitRegionUpdate')
      assert.deepEqual(store.dispatch.args[0][1], {
        region: existing,
        update: {
          id: 'two',
          text: 'bar',
          translation: 'foobar',
        },
      })
      // creates the intermediary "queue" object
      assert.deepEqual(store.saveState.REGION_INTERMEDIARY, {
        id: 'two',
        text: 'bar',
        translation: 'foobar',
      })
      // enqueues local save attempt
      assert.deepEqual(store.dispatch.args[1], ['enqueueRegionUpdate', 'two'])
    })
  })

  describe('actions.enqueueRegionUpdate', function () {
    it('should reject if no regionId', async function () {
      await assert.rejects(
        async () => {
          await store.actions.enqueueRegionUpdate({}, null)
        },
        {
          name: 'AssertionError',
          message: 'regionId must be provided',
        },
      )
    })

    it('should attempt save if outbox not busy', async function () {
      store.dispatch = this.sandbox.stub()
      assert.equal(store.saveState.DS_OUTBOX_BUSY, false)
      await store.actions.enqueueRegionUpdate(store, 'two')
      assert.equal(store.dispatch.callCount, 1)
      assert.deepEqual(store.dispatch.args[0], ['commitToDataStore', 'two'])
    })

    it('should enqueue the save (and retry) if outbox is busy', async function () {
      store.dispatch = this.sandbox.stub()
      const timer = this.sandbox.stub(Timeout, 'set')
      
      store.saveState.DS_OUTBOX_BUSY = true
      await store.actions.enqueueRegionUpdate(store, 'two')

      // attempt DB save should not be called yet
      assert.equal(store.dispatch.callCount, 0)
      
      // activate the timeout
      const timerCallback = timer.args[0][1]
      timerCallback()
      // retry should now be called
      assert.equal(store.dispatch.callCount, 1)
      assert.deepEqual(store.dispatch.args[0], ['enqueueRegionUpdate', 'two'])
    })
  })

  describe('actions.commitToDataStore', function () {
    it('should reject if no regionId', async function () {
      await assert.rejects(
        async () => {
          await store.actions.commitToDataStore({}, null)
        },
        {
          name: 'AssertionError',
          message: 'regionId must be provided',
        },
      )
    })

    it('should JSON encode text, issues, comments', async function () {
      const query = this.sandbox.stub(DataStore, 'query')
      const copyOf = this.sandbox.stub(Region, 'copyOf').returns('a copy')
      const save = this.sandbox.stub(DataStore, 'save')
      this.sandbox.stub(UserService, 'getUser').resolves({name: 'me', email: 'me@you.com'})

      store.saveState.REGION_INTERMEDIARY = {
        id: 'two',
        text: [{ insert: 'foo' }],
        comments: ['one', 'two'],
        issues: [{ some: 'issue' }],
        translation: 'foobar'
      }

      await store.actions.commitToDataStore(store, 'two')

      // grab Region.copyOf callback and execute it
      const copyOfCb = copyOf.args[0][1]
      const dummyToUpdate = {}
      copyOfCb(dummyToUpdate)

      assert.equal(dummyToUpdate.text, '[{"insert":"foo"}]')
      assert.equal(dummyToUpdate.comments, '["one","two"]')
      assert.equal(dummyToUpdate.issues, '[{"some":"issue"}]')
      assert.equal(dummyToUpdate.translation, 'foobar')

      // should have added user and dateLastUpdated
      assert.equal(dummyToUpdate.userLastUpdated, 'me')
      assert.ok(dummyToUpdate.dateLastUpdated)

      // DataStore.save() should be called with the copy
      assert.equal(save.args[0][0], 'a copy')

    })
  })
})