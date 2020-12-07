import assert from 'assert'
import sinon from 'sinon'

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

import RTE from '@/components/transcribe/RTE.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// helper to delay execution
async function wait(time = 5) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
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
    await wait()
    this.sandbox.restore()
  })

  describe('addIssue()', function () {
    it('should add an issue', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            {
              insert: 'This is a simple line of text',
            },
          ],
        },
      })

      const issue = {
        index: 10,
        text: 'simple',
        type: 'needs-help',
        id: 'issue-needs-help-1234567890',
      }

      wrapper.vm.addIssue(issue)

      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('change-format'))
      assert.deepEqual(events['change-format'][0][0], [
        { insert: 'This is a ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' },
          insert: 'simple',
        },
        { insert: ' line of text\n' },
      ])
    })
  })

  describe('removeIssue()', function () {
    it('should remove and issue by id', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is a ' },
            {
              attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' },
              insert: 'simple',
            },
            { insert: ' line of text\n' },
          ],
        },
      })

      const issueId = 'issue-needs-help-1234567890'

      wrapper.vm.removeIssue(issueId)

      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('change-format'))
      assert.deepEqual(events['change-format'][0][0], [
        {
          insert: 'This is a simple line of text\n',
        },
      ])
    })
  })

  describe('validateIssues()', function () {
    it('should add an issue that is missing', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is a ' },
            {
              attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' },
              insert: 'simple',
            },
            { insert: ' line of text\n' },
          ],
        },
      })

      const issues = [
        {
          id: 'issue-needs-help-1234567890',
          type: 'needs-help',
          createdAt: '1234567890',
          resolved: false,
          owner: 'foobar',
          text: 'simple',
          comments: [],
          index: 0,
        },
        {
          id: 'issue-indexing-2345678901',
          type: 'needs-help',
          createdAt: '2345678901',
          resolved: false,
          owner: 'foobar',
          text: 'of',
          comments: [],
          index: 22,
        },
      ]

      wrapper.vm.validateIssues(issues)
      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('change-format'))

      const expected = [
        { insert: 'This is a ' },
        { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'simple' },
        { insert: ' line ' },
        { attributes: { 'issue-needs-help': 'issue-indexing-2345678901' }, insert: 'of' },
        { insert: ' text\n' },
      ]
      assert.deepEqual(events['change-format'][0][0], expected)
    })

    it('should not add resolved issues', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is a ' },
            {
              attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' },
              insert: 'simple',
            },
            { insert: ' line of text\n' },
          ],
        },
      })

      const issues = [
        {
          id: 'issue-needs-help-1234567890',
          type: 'needs-help',
          createdAt: '1234567890',
          resolved: false,
          owner: 'foobar',
          text: 'simple',
          comments: [],
          index: 0,
        },
        {
          id: 'issue-indexing-2345678901',
          type: 'needs-help',
          createdAt: '2345678901',
          resolved: true,
          owner: 'foobar',
          text: 'of',
          comments: [],
          index: 22,
        },
      ]

      wrapper.vm.validateIssues(issues)
      const events = wrapper.emitted()
      assert.ok(!Object.keys(events).includes('change-format'))

      const expected = [
        { insert: 'This is a ' },
        { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'simple' },
        { insert: ' line of text\n' },
      ]
      assert.deepEqual(wrapper.vm.editor.getContents().ops, expected)
    })

    it('should remove a resolved issue', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is a ' },
            { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'simple' },
            { insert: ' line ' },
            { attributes: { 'issue-needs-help': 'issue-needs-help-2345678901' }, insert: 'of' },
            { insert: ' text\n' },
          ],
        },
      })

      const issues = [
        {
          id: 'issue-needs-help-1234567890',
          type: 'needs-help',
          createdAt: '1234567890',
          resolved: false,
          owner: 'foobar',
          text: 'simple',
          comments: [],
          index: 0,
        },
        {
          id: 'issue-needs-help-2345678901',
          type: 'needs-help',
          createdAt: '2345678901',
          resolved: true,
          owner: 'foobar',
          text: 'of',
          comments: [],
          index: 22,
        },
      ]

      wrapper.vm.validateIssues(issues)
      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('change-format'))

      const expected = [
        { insert: 'This is a ' },
        { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'simple' },
        { insert: ' line of text\n' },
      ]
      console.log(JSON.stringify(events['change-format'][0][0]))
      assert.deepEqual(events['change-format'][0][0], expected)
    })

    it('should remove an issue from text not in the list', async function () {
      const wrapper = shallowMount(RTE, {
        store,
        localVue,
        propsData: {
          text: [
            { insert: 'This is a ' },
            { attributes: { 'issue-needs-help': 'issue-needs-help-1234567890' }, insert: 'simple' },
            { insert: ' line ' },
            { attributes: { 'issue-needs-help': 'issue-indexing-2345678901' }, insert: 'of' },
            { insert: ' text\n' },
          ],
        },
      })

      const issues = [
        {
          id: 'issue-indexing-2345678901',
          type: 'needs-help',
          createdAt: '2345678901',
          resolved: false,
          owner: 'foobar',
          text: 'of',
          comments: [],
          index: 22,
        },
      ]

      wrapper.vm.validateIssues(issues)
      const events = wrapper.emitted()
      assert.ok(Object.keys(events).includes('change-format'))

      const expected = [
        { insert: 'This is a simple line ' },
        { attributes: { 'issue-needs-help': 'issue-indexing-2345678901' }, insert: 'of' },
        { insert: ' text\n' },
      ]
      assert.deepEqual(events['change-format'][0][0], expected)
    })

    xit('should not change anything if issues and text are in sync', async function () {
      const wrapper = shallowMount(RTE, {
        propsData: {
          text: [
            {
              insert: 'Some ',
            },
            {
              insert: 'text here',
              attributes: {
                'issue-indexing': 'issue-indexing-1234567890',
              },
            },
            {
              insert: ' and another.',
            },
          ],
        },
      })

      const rendered = wrapper.vm
      // const result = rendered.getTextMapFromDeltas(deltas)

      // const expected = {
      //   'kā-miyo-kīsikwiw': { original: '[kā-miyo-kīsikwiw', length: 17, index: 0 },
      //   kīhikāw: { original: 'kīhikāw?]', length: 9, index: 18 },
      // }
      // assert.deepEqual(result, expected)
    })
  })
})
