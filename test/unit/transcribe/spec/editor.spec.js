import assert from 'assert'
import sinon from 'sinon'
import { shallowMount } from '@vue/test-utils'
import Editor from '@/components/transcribe/Editor.vue'
import Lex from '../../../../src/services/lexicon'

/**
 * README: do not make editor changes using `this.rendered.quill.insertText()` etc,
 * there are many events that emit from the editors at various times (including load)
 * which creates a lot of false positives under test.
 */

const pause = (time = 5) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

/**
 * EVENTS
 */
describe('Editor -> events', function () {
  before(function () {
    this.sandbox = sinon.createSandbox()
  })

  beforeEach(function () {
    this.wrapper = shallowMount(Editor, {
      propsData: {
        editing: true,
        region: {
          id: 'my-region-id',
          text: [],
          start: 1.35,
          end: 4.45,
          translation: null,
        },
      },
    })
    this.rendered = this.wrapper.vm
    this.searchStub = this.sandbox.stub(Lex, 'wordSearch')
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  describe('onEditorTextChange', async function () {
    it('should invalidate known words when text changes', async function () {
      const invalidateStub = this.sandbox.stub(this.rendered, 'invalidateKnownWords')

      this.rendered.onEditorTextChange({}, {}, 'user')
      assert.ok(invalidateStub.called)
    })

    it('should dispatch a region-text-updated event when text changes', async function () {
      const notifyStub = this.sandbox.stub(this.rendered, 'notifyRegionChanged')
      this.rendered.onEditorTextChange({}, {}, 'user')
      // give the event a second to emit
      await pause()
      assert.ok(notifyStub.called)
    })

    it('should do nothing for non-user events', async function () {
      const notifyStub = this.sandbox.stub(this.rendered, 'notifyRegionChanged')
      const invalidateStub = this.sandbox.stub(this.rendered, 'invalidateKnownWords')
      this.rendered.onEditorTextChange({}, {}, 'api')
      // give the event a second to emit
      await pause()
      assert.ok(!notifyStub.called)
      assert.ok(!invalidateStub.called)
    })
  })
})

/**
 * COMPUTED
 */
describe('Editor -> computed()', function () {
  describe('needsReview()', async function () {
    it('should return false when text does not have ??', function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here \n' }],
          },
        },
      }).vm
      assert.strictEqual(rendered.needsReview, false)
    })

    it('should return true when text has ??', function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
        },
      }).vm
      assert.strictEqual(rendered.needsReview, true)
    })

    it('should return true when any text has ??', function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [
              { insert: 'Another region here\n' },
              { insert: 'Another region here\n' },
              { insert: 'Another ??region here\n' },
            ],
          },
        },
      }).vm
      assert.strictEqual(rendered.needsReview, true)
    })
  })

  describe('orderedIssueComments()', async function () {
    it('should return ordered issue comments', function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
          user: { name: 'Joe' },
        },
      }).vm
      rendered.selectedIssue = {
        comments: [
          { id: 2, createdAt: 2, name: 'foo' },
          { id: 3, createdAt: 3, name: 'bar' },
        ],
        createdAt: 0,
      }

      const orderedComments = rendered.orderedIssueComments
      assert.strictEqual(orderedComments[0].id, 3)
      assert.strictEqual(orderedComments[0].name, 'bar')
      assert.strictEqual(orderedComments[1].id, 2)
      assert.strictEqual(orderedComments[1].name, 'foo')
    })

    it('should return empty list', async function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
          user: { name: 'Joe' },
        },
      }).vm
      rendered.selectedIssue = {
        comments: [],
        createdAt: 0,
      }

      const orderedComments = rendered.orderedIssueComments
      assert.equal(orderedComments.length, 0)
    })
  })

  // /**
  //  * This is the main event where transcription data is sync'd up with other
  //  * users and the database.
  //  */
  // it.only('should emit region id and source when text changes', async function () {
  //   this.rendered.onEditorTextChange(null, null, 'user')
  //   // give the event a second to emit
  //   const event = this.wrapper.emitted()['region-text-updated']
  //   assert.ok(event)
  //   const data = event[0][0]
  //   assert.strictEqual(data.id, 'my-region-id')
  //   assert.strictEqual(data.editor, 'main')
  // })

  // it('should emit region id and source when translation changes', async function () {
  //   this.rendered.onTranslationTextChange(null, null, 'user')
  //   await pause()
  //   const event = this.wrapper.emitted()['region-text-updated']
  //   const data = event[0][0]
  //   assert.strictEqual(data.id, 'my-region-id')
  //   assert.strictEqual(data.editor, 'secondary')
  // })

  // it('should emit editor-focus on user selection', async function () {
  //   this.rendered.onEditorSelectionChange({ some: 'range' }, null, 'user')
  //   await pause()
  //   const event = this.wrapper.emitted()['editor-focus']
  //   assert.ok(event)
  //   const id = event[0][0]
  //   assert.strictEqual(id, 'my-region-id')
  // })

  // it('should emit region-cursor on user selection (and throttled)', async function () {
  //   // emit 2 events within the throttle timeout
  //   this.rendered.onEditorSelectionChange({ some: 'range' }, null, 'user')
  //   await pause(40)
  //   this.rendered.onEditorSelectionChange({ some: 'range' }, null, 'user')
  //   // let the event resolve
  //   await pause(125)
  //   const event = this.wrapper.emitted()['region-cursor']
  //   assert.ok(event)
  //   // event should only be emitted once
  //   assert.strictEqual(event.length, 1)
  //   const data = event[0][0]
  //   assert.strictEqual(data.id, 'my-region-id')
  //   assert.deepStrictEqual(data.range, { some: 'range' })
  // })

  // it('should notify when focus is lost', async function () {
  //   this.rendered.onEditorSelectionChange(null, null, 'user')
  //   await pause()
  //   const event = this.wrapper.emitted()['editor-blur']
  //   assert.ok(event)
  //   const id = event[0][0]
  //   assert.strictEqual(id, 'my-region-id')
  // })
})

/**
 * METHODS
 */
describe('Editor -> methods()', async function () {
  describe('getIssueCount()', function () {
    it('should return issue count', async function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
          user: { name: 'Joe' },
        },
      }).vm
      rendered.issues = [
        { id: 'issue-foo-1', type: 'bar', resolved: false, comments: [], createdAt: 0 },
        { id: 'issue-foo-2', type: 'baz', resolved: false, comments: [], createdAt: 0 },
      ]
      assert.equal(rendered.getIssueCount(), 2)
    })

    it('should not count resolved issues', async function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
          user: { name: 'Joe' },
        },
      }).vm
      rendered.issues = [
        { id: 'issue-foo-1', type: 'bar', resolved: false, comments: [], createdAt: 0 },
        { id: 'issue-foo-2', type: 'baz', resolved: true, comments: [], createdAt: 0 },
      ]
      assert.equal(rendered.getIssueCount(), 1)
    })

    it('should return 0', async function () {
      const rendered = shallowMount(Editor, {
        propsData: {
          region: {
            id: 'my-region-id',
            text: [{ insert: 'Another region here ?? \n' }],
          },
          user: { name: 'Joe' },
        },
      }).vm
      rendered.issues = []
      assert.equal(rendered.getIssueCount(), 0)
    })
  })

  it('getSanitizedEditorText() should return a clean list (no newlines)')
})

describe('-> known words', function () {
  it('should not have any known words if none are matched')
  it('should mark known words')
  it('should mark known words against punctuation like `foo.`')
  it('should mark known words with puntuation in the middle like `fo(o)`')
  it('should unmark a known word that is split `ap art`')
})
