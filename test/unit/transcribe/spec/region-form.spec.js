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

describe.only('components/RegionForm', function () {
  let getters
  let store

  beforeEach(() => {
    getters = {
      selectedRegion: () => {
        return {}
      },
      locks: () => {
        return {}
      },
      selectedIssue: () => {
        return {}
      },
    }
    store = new Vuex.Store({
      getters,
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
})
