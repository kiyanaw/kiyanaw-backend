import assert from 'assert'
import { shallowMount } from '@vue/test-utils'
import Editor from '@/components/transcribe/Editor.vue'

describe('components/Editor', function () {
  before(() => {
    this.wrapper = shallowMount(Editor, {
      propsData: {
        regionId: 'foo',
        text: [{ insert: 'hello world' }],
        start: 1.35,
        end: 4.45
      }
    })
    this.rendered = this.wrapper.vm
  })
  describe('-> props', () => {
    it('should have a regionId based on the params', async () => {
      assert.deepStrictEqual(this.rendered.regionId, 'foo')
    })

    it('should have start time based on props', async () => {
      const startTime = this.rendered.$el.querySelector('.region-start').innerText
      assert.strictEqual(startTime, '0:01.35')
    })

    it('should have end time based on props', async () => {
      const endTime = this.rendered.$el.querySelector('.region-end').innerText
      assert.strictEqual(endTime, '0:04.45')
    })

    it('should have text based on props', async () => {
      const editorContent = this.rendered.quill.getContents().ops
      assert.strict.deepEqual(editorContent,
        [{ insert: 'hello world\n' }])
    })
  })
  describe('-> events', () => {
    it('should emit `region-delta` event on user input', () => {
      this.rendered.quill.insertText(0, 'Yo ', 'user')
      const event = this.wrapper.emitted()['region-delta'][0]
      assert.ok(event)
      assert.strict.deepEqual(event[0].name, 'foo')
      assert.strict.deepEqual(event[0].delta.ops, [{ insert: 'Yo ' }])
    })

    /**
     * Quill.setSelection() at test-time doesn't seem to fire for
     * some reason, it seems there may be an underlying issue
     * in the browser.
     *
     * TODO: test this independently and submit to quill.
     */
    xit('should emit `region-cursor` event on user click/type', () => {
      // setSelection(index: Number, length: Number = 0, source: String = 'api')
      // this.rendered.quill.setSelection({ index: 1, length: 1 }, 'user')
      this.rendered.quill.getSelection(true)
      this.rendered.quill.setSelection(1, 0, 'user')
      console.log(this.wrapper.emitted())
    })
  })
})
