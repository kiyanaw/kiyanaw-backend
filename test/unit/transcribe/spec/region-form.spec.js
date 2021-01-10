import assert from 'assert'
import sinon from 'sinon'

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import RegionForm from '@/components/transcribe/RegionForm.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// helper to delay execution
async function wait(time = 5) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}

describe('components/RegionForm', function () {
  let getters
  let store
  let state

  beforeEach(() => {
    getters = {
      selectedRegion: (context) => {
        return context.selectedRegion
      },
      locks: () => {
        return {}
      },
      selectedIssue: () => {
        return {}
      },
      user: () => {
        return {}
      },
    }
    state = {
      selectedRegion: {
        issues: [],
      },
    }
    store = new Vuex.Store({
      getters,
      state,
    })
  })

  before(function () {
    this.sandbox = sinon.createSandbox()
  })

  after(async function () {
    await wait()
    this.sandbox.restore()
  })

  describe('getTextMapFromDeltas()', function () {
    it('should parse deltas')

    it('should scrub brackets [] and return proper result', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })

      const rendered = wrapper.vm
      const deltas = [{ insert: '[kā-miyo-kīsikwiw kīhikāw?] \n' }]
      const result = rendered.getTextMapFromDeltas(deltas)

      const expected = {
        'kā-miyo-kīsikwiw': { original: '[kā-miyo-kīsikwiw', length: 17, index: 0 },
        kīhikāw: { original: 'kīhikāw?]', length: 9, index: 18 },
      }
      assert.deepEqual(result, expected)
    })
  })

  describe('watch -> issues()', function () {
    it('should trigger issue invalidation when not note', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      const invalidateStub = this.sandbox.stub(rendered, 'doTriggerIssueInvalidation')

      state.selectedRegion.issues = [{ some: 'issue' }]

      await new Promise((resolve) => setTimeout(resolve, 20))
      assert.equal(invalidateStub.callCount, 1)
    })

    it('should NOT trigger issue invalidation when note', async function () {
      state.selectedRegion.isNote = true
      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      const invalidateStub = this.sandbox.stub(rendered, 'doTriggerIssueInvalidation')

      state.selectedRegion.issues = [{ some: 'issue' }]

      await new Promise((resolve) => setTimeout(resolve, 10))
      assert.equal(invalidateStub.callCount, 0)
    })
  })

  describe('watch -> selectedRegion()', function () {
    it('should invalidate issues AFTER region updates', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      const invalidateStub = this.sandbox.stub(rendered, 'doTriggerIssueInvalidation')
      const setContentsStub = this.sandbox.stub(rendered, 'doSetEditorsContents')

      state.selectedRegion = { issues: [{ some: 'issue' }] }

      await new Promise((resolve) => setTimeout(resolve, 25))
      assert.equal(invalidateStub.callCount, 1)
      assert.equal(setContentsStub.callCount, 1)

      sinon.assert.callOrder(setContentsStub, invalidateStub)
    })
  })
})
