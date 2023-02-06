import assert from 'assert'
import sinon from 'sinon'
import Vuex from 'vuex'
import { shallowMount, createLocalVue } from '@vue/test-utils'

import AudioPlayer from '@/components/transcribe/AudioPlayer.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// const pause = (time = 5) => {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve()
//     }, time)
//   })
// }

/**
 * METHODS
 */
describe('AudioPlayer -> methods()', async function () {
  let getters
  let store
  let state

  beforeEach(() => {
    getters = {
      regions: () => {
        return []
      },
      transcription: () => {
        return {}
      }
    },
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

  describe('onRegionUpdate()', function () {
    it('should emit a specific event and data', async function () {
      const wrapper = shallowMount(AudioPlayer, {
        store,
        localVue,
      })

      const inputEvent = {
        id: 'foo',
        start: 1,
        end: 3,
        attributes: {
          index: 1234
        }
      }
      wrapper.vm.onRegionUpdate(inputEvent)

      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('region-updated'))
      const args = events['region-updated'][0][0]
      assert.strictEqual(args.id, 'foo')
      assert.strictEqual(args.start, 1)
      assert.strictEqual(args.end, 3)
      assert.strictEqual(args.index, 1234)
    })
  })

})

