
import assert from 'assert'
import sinon from 'sinon'

import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'
import region from '../../../../src/store/region'

const localVue = createLocalVue()
localVue.use(Vuex)

const pause = (time = 5) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

describe('Mutations -> region', function () {

  let store
  before(function () {
    this.sandbox = sinon.createSandbox()
  })
  
  beforeEach(() => {
    store = new Vuex.Store(region)
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  describe('updateRegionById()', function () {
    it('should commit UPDATE_REGION', async function () {
      const dispatchStub = this.sandbox.stub(store, 'dispatch')

      // set up the initial data
      region.actions.setRegions(store, [{id: 'foo', start: 1, end: 3, text: []}])

      // trigger the update
      region.actions.updateRegionById(store, {
        id: 'foo',
        update: { start: 3, end: 5, index: 1 }
      })
      assert.strictEqual(dispatchStub.callCount, 1)

      // make sure the saveRegion event was dispatched appropriately
      const event = dispatchStub.args[0][0]
      assert.strictEqual(event, 'saveRegion')
      const eventPayload = JSON.parse(JSON.stringify(dispatchStub.args[0][1]))
      assert.deepStrictEqual(eventPayload, {
        id: 'foo',
        start: 3,
        end: 5,
        index: 1,
        text: [],
        displayIndex: 1,
      })
    })
  })

  describe('updateRegion()', function () {
    it('should commit UPDATE_REGION', async function () {
      const dispatchStub = this.sandbox.stub(store, 'dispatch')

      // set up the initial data
      region.actions.setRegions(store, [{id: 'foo', start: 1, end: 3, text: []}])
      region.actions.setSelectedRegion(store, 'foo')

      // trigger the update
      region.actions.updateRegion(store, {start: 3, end: 5})
      assert.strictEqual(dispatchStub.callCount, 1)

      // make sure the saveRegion event was dispatched appropriately
      const event = dispatchStub.args[0][0]
      assert.strictEqual(event, 'saveRegion')
      const eventPayload = JSON.parse(JSON.stringify(dispatchStub.args[0][1]))
      assert.deepStrictEqual(eventPayload, {
        id: 'foo',
        start: 3,
        end: 5,
        index: 0,
        text: [],
        displayIndex: 1,
      })
    })
  })
})