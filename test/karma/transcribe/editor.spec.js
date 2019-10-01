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
    it('should have canEdit')

    it('should have a regionId based on the params', async () => {
      assert.deepStrictEqual(this.rendered.regionId, 'foo')
    })

    it('should have start time based on props', async () => {
      const startTime = this.rendered.$el.querySelector('.region-start').innerText
      assert.strictEqual(startTime, '00:01.35')
    })

    it('should have end time based on props', async () => {
      const endTime = this.rendered.$el.querySelector('.region-end').innerText
      assert.strictEqual(endTime, '00:04.45')
    })

    it('should have text based on props', async () => {
      const editorContent = this.rendered.quill.getContents().ops
      assert.strict.deepEqual(editorContent,
        [{ insert: 'hello world\n' }])
    })
  })
})
