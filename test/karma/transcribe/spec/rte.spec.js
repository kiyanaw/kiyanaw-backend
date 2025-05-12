import assert from 'assert'
import sinon from 'sinon'

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import RTE from '@/components/transcribe/RTE.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const pause = (time = 5) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

describe('components/RTE', function () {
  let getters
  let store

  beforeEach(() => {
    getters = {
      selectedRegion: () => {
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
    await pause()
    this.sandbox.restore()
  })

  describe('maybeAddASpaceAtTheEnd()', function () {
    it('should add a space after an issue', function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is an ' },
            { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'issue' },
          ],
        },
      })
      const rendered = wrapper.vm

      // trigger change
      rendered.onChange(null, null, 'user')

      // pull out the last delta and verify there's a space before the newline
      const contents = rendered.editor.getContents().ops
      assert.strictEqual(contents.pop().insert, ' \n')
    })
  })
})
