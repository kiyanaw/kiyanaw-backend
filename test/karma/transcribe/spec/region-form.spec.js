import assert from 'assert'
import sinon from 'sinon'

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import RegionForm from '@/components/transcribe/RegionForm.vue'
import Lexicon from '@/services/lexicon'

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
      transcription: (context) => {
        return context.transcription
      },
      user: () => {
        return {}
      },
    }
    state = {
      selectedRegion: {
        issues: [],
      },
      transcription: { editors: [] },
    }
    store = new Vuex.Store({
      getters,
      state,
    })
  })

  before(function () {
    this.sandbox = sinon.createSandbox()
  })

  afterEach(async function () {
    await wait()
    this.sandbox.restore()
  })

  describe('getTextMapFromDeltas()', function () {
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

    it('should scrub brackets double-quotes and return proper result', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })

      const rendered = wrapper.vm
      const deltas = [{ insert: '"kā-miyo-kīsikwiw kīhikāw" \n' }]
      const result = rendered.getTextMapFromDeltas(deltas)

      const expected = {
        'kā-miyo-kīsikwiw': { original: '"kā-miyo-kīsikwiw', length: 17, index: 0 },
        kīhikāw: { original: 'kīhikāw"', length: 8, index: 18 },
      }
      assert.deepEqual(result, expected)
    })

    it('should handle multiples of the same word', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })

      const rendered = wrapper.vm
      const deltas = [{ insert: 'ana awa êwako awa \n' }]
      const result = rendered.getTextMapFromDeltas(deltas)

      const expected = {
        ana: { original: 'ana', length: 3, index: 0 },
        awa: [
          { original: 'awa', length: 3, index: 4 },
          { original: 'awa', length: 3, index: 14 },
        ],
        êwako: { original: 'êwako', length: 5, index: 8 },
      }
      assert.deepEqual(result, expected)
    })

    it('should handle many multiples of the same word', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })

      const rendered = wrapper.vm
      const deltas = [
        { insert: ' ana ' },
        { insert: 'oma' },
        {
          insert: ' ana awa ana \n',
        },
      ]
      const result = rendered.getTextMapFromDeltas(deltas)

      const expected = {
        ana: [
          { original: 'ana', length: 3, index: 1 },
          { original: 'ana', length: 3, index: 9 },
          { original: 'ana', length: 3, index: 17 },
        ],
        oma: { original: 'oma', length: 3, index: 5 },
        awa: { original: 'awa', length: 3, index: 13 },
      }
      assert.deepEqual(result, expected)
    })
  })

  describe('applyKnownWords() - doUpdate=true', function () {
    it('should apply [foo, bar]', async function () {
      // set up the region
      store.state.selectedRegion = {
        text: [{ insert: 'foo' }, { insert: ' ' }, { insert: 'bar' }, { insert: ' \n' }],
      }

      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      // mock the return value for known words
      this.sandbox.stub(Lexicon, 'getKnownWords').returns(['foo', 'bar'])

      const clearStub = this.sandbox.stub(rendered, 'editorClearKnownWords')
      const applyStub = this.sandbox.stub(rendered, 'editorApplyKnownWords')
      const hintStub = this.sandbox.stub(rendered, 'editorApplyKnownHint')

      await rendered.applyKnownWords(true)

      assert.ok(!hintStub.called)
      assert.ok(clearStub.called)
      // applies two known words
      assert.equal(applyStub.callCount, 2)
      // applies foo
      assert.deepEqual(applyStub.args[0], [0, 3])
      // applies bar
      assert.deepEqual(applyStub.args[1], [4, 3])
    })

    it('should apply duplicate [foo, bar, foo]', async function () {
      // set up the region
      store.state.selectedRegion = {
        text: [
          { insert: 'foo' },
          { insert: ' ' },
          { insert: 'bar' },
          { insert: ' ' },
          { insert: 'foo' },
          { insert: ' \n' },
        ],
      }

      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      // mock the return value for known words
      this.sandbox.stub(Lexicon, 'getKnownWords').returns(['foo', 'bar'])

      const clearStub = this.sandbox.stub(rendered, 'editorClearKnownWords')
      const applyStub = this.sandbox.stub(rendered, 'editorApplyKnownWords')
      const hintStub = this.sandbox.stub(rendered, 'editorApplyKnownHint')

      await rendered.applyKnownWords(true)

      assert.ok(!hintStub.called)
      assert.ok(clearStub.called)
      // applies two known words
      assert.equal(applyStub.callCount, 3)
      // applies foo
      assert.deepEqual(applyStub.args[0], [0, 3])
      // applies foo again
      assert.deepEqual(applyStub.args[1], [8, 3])
      // applies bar
      assert.deepEqual(applyStub.args[2], [4, 3])
    })

    it('should do clear known words when no matches', async function () {
      // set up the region
      store.state.selectedRegion = {
        text: [{ insert: 'foo' }, { insert: ' ' }, { insert: 'bar' }, { insert: ' \n' }],
      }

      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      // mock the return value for known words
      this.sandbox.stub(Lexicon, 'getKnownWords').returns([])

      const clearStub = this.sandbox.stub(rendered, 'editorClearKnownWords')
      const applyStub = this.sandbox.stub(rendered, 'editorApplyKnownWords')
      const hintStub = this.sandbox.stub(rendered, 'editorApplyKnownHint')

      await rendered.applyKnownWords(true)

      assert.ok(!hintStub.called)
      assert.ok(clearStub.called)
      // applies zero known words
      assert.equal(applyStub.callCount, 0)
      assert.equal(clearStub.callCount, 1)
    })
  })

  describe('applyKnownWords() - doUpdate=false', function () {
    it('should apply hints', async function () {
      // set up the region
      store.state.selectedRegion = {
        text: [{ insert: 'foo' }, { insert: ' ' }, { insert: 'bar' }, { insert: ' \n' }],
      }

      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      // mock the return value for known words
      this.sandbox.stub(Lexicon, 'getKnownWords').returns(['foo', 'bar'])

      const clearStub = this.sandbox.stub(rendered, 'editorClearKnownWords')
      const applyStub = this.sandbox.stub(rendered, 'editorApplyKnownWords')
      const hintStub = this.sandbox.stub(rendered, 'editorApplyKnownHint')

      await rendered.applyKnownWords(false)

      assert.ok(!applyStub.called)
      assert.ok(!clearStub.called)
      // applies two known words
      assert.ok(hintStub.callCount, 2)
      // applies foo
      assert.deepEqual(hintStub.args[0], [0, 3])
      // applies bar
      assert.deepEqual(hintStub.args[1], [4, 3])
    })
  })

  describe('checkForKnownWords()', function () {
    it('should do nothing if analysis is diabled', async function () {
      store.state.transcription.disableAnalyzer = true

      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm
      // mock the return value for known words
      const knownStub = this.sandbox.stub(rendered, 'applyKnownWords')

      rendered.checkForKnownWords()

      assert.ok(!knownStub.called)
    })

    it('should apply known words immediately, then search after timer', async function () {
      const clock = sinon.useFakeTimers()
      store.state.selectedRegion = {
        text: [{ insert: 'foo' }, { insert: ' ' }, { insert: 'bar' }, { insert: ' \n' }],
      }
      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm
      // mock the return value for known words
      const knownStub = this.sandbox.stub(rendered, 'applyKnownWords')

      const existingStub = this.sandbox.stub(Lexicon, 'getKnownWords').returns(['foo'])
      const searchStub = this.sandbox.stub(Lexicon, 'wordSearch')

      rendered.checkForKnownWords()

      assert.ok(knownStub.called)
      assert.ok(!existingStub.called)
      assert.ok(!searchStub.called)

      await clock.tick(1000)

      assert.equal(existingStub.called, true)
      assert.deepEqual(searchStub.args[0][0], ['bar'])

      assert.ok(searchStub.called)

      clock.restore()
    })
  })

  describe('watch -> issues()', function () {
    it('should trigger issue invalidation when not note', async function () {
      const wrapper = shallowMount(RegionForm, { store, localVue })
      const rendered = wrapper.vm

      const invalidateStub = this.sandbox.stub(rendered, 'doTriggerIssueInvalidation')

      state.selectedRegion.issues = [{ some: 'issue' }]

      // INVALIDATE_ISSUES_TIMING IS 250
      await new Promise((resolve) => setTimeout(resolve, 350))
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

      await new Promise((resolve) => setTimeout(resolve, 350))
      assert.equal(invalidateStub.callCount, 1)
      assert.equal(setContentsStub.callCount, 1)

      sinon.assert.callOrder(setContentsStub, invalidateStub)
    })
  })
})
