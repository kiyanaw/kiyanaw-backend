import assert from 'assert'
import sinon from 'sinon'
import { shallowMount } from '@vue/test-utils'
import TranscriptionService from '@/services/transcriptions'
import UserService from '@/services/user'
import Transcribe from '@/components/transcribe/Transcribe.vue'

import transcriptionData from './data/transcribe-data.json'

const $route = {
  path: '/transcribe-edit/',
  params: {
    id: 'someid12345'
  },
  hash: ''
}

// helper to delay execution
async function wait (time = 5) {
  return new Promise(function (resolve) { setTimeout(resolve, time) })
}

describe('components/Transcribe', function () {
  before(function () {
    this.sandbox = sinon.createSandbox()
    const userServiceStub = this.sandbox.stub(UserService, 'getUser')
    userServiceStub.resolves({ name: 'Jane' })
  })

  after(async function () {
    await wait()
    this.sandbox.restore()
  })

  it('should set up default state using route params', async function () {
    const loadStub = sinon.stub(TranscriptionService, 'getTranscription')
    loadStub.resolves(transcriptionData)
    const wrapper = shallowMount(Transcribe, { mocks: { $route } })
    // let load() resolve
    await wait()
    const rendered = wrapper.vm
    assert.strictEqual(rendered.transcriptionId, 'someid12345')
    // transcription data
    assert.strictEqual(rendered.title, 'This is my title')
    assert.strictEqual(rendered.audioFile, 'https://some.url/foobar.mp3')
    assert.strictEqual(rendered.regions.length, 6)
    assert.strictEqual(rendered.authorId, 'admin:54aaaff460d71b2f5eedc6961e198331')
    assert.strictEqual(rendered.inboundRegion, null)
    loadStub.restore()
  })

  it('should have an inbound region #foo from url hash', async function () {
    const loadStub = sinon.stub(TranscriptionService, 'getTranscription')
    loadStub.resolves(transcriptionData)
    const wrapper = shallowMount(Transcribe, { mocks: { $route: { ...$route, hash: '#foo' } } })
    // let load() resolve
    await wait()
    const rendered = wrapper.vm
    assert.strictEqual(rendered.transcriptionId, 'someid12345')
    assert.strictEqual(rendered.inboundRegion, 'foo')
    loadStub.restore()
  })

  /**
   * Manage regions
   */
  describe('Regions', function () {
    it('should add a new region', async function () {
      // set up a new transcription with no regions
      const transcription = JSON.parse(JSON.stringify(transcriptionData))
      delete transcription.regions
      // mount the component
      const loadStub = sinon.stub(TranscriptionService, 'getTranscription')
      loadStub.resolves(transcription)
      const wrapper = shallowMount(Transcribe, { mocks: { $route } })
      const component = wrapper.vm
      await wait()
      // make sure there are no regions
      assert.strictEqual(component.regions.length, 0)
      // add a region
      component.onUpdateRegion({
        id: 'my-region',
        start: 0.123,
        end: 0.456
      })
      assert.strictEqual(component.regions.length, 1)
      // check sorted regions
      assert.strictEqual(component.regions[0].id, 'my-region')
      assert.strictEqual(component.regions[0].start, 0.123)
      assert.strictEqual(component.regions[0].end, 0.456)
      loadStub.restore()
    })

    it('should update a region', async function () {
      // set up a new transcription with no regions
      const transcription = JSON.parse(JSON.stringify(transcriptionData))
      delete transcription.regions
      // mount the component
      const loadStub = sinon.stub(TranscriptionService, 'getTranscription')
      loadStub.resolves(transcription)
      const wrapper = shallowMount(Transcribe, { mocks: { $route } })
      const component = wrapper.vm
      await wait()
      // make sure there are no regions
      assert.strictEqual(component.regions.length, 0)
      // add a region
      component.onUpdateRegion({
        id: 'my-region',
        start: 0.123,
        end: 0.456
      })
      assert.strictEqual(component.regions.length, 1)
      assert.strictEqual(component.regions[0].id, 'my-region')
      assert.strictEqual(component.regions[0].start, 0.123)
      // update the region
      component.onUpdateRegion({
        id: 'my-region',
        start: 0.124,
        end: 0.456
      })
      assert.strictEqual(component.regions.length, 1)
      assert.strictEqual(component.regions[0].id, 'my-region')
      assert.strictEqual(component.regions[0].start, 0.124)
      loadStub.restore()
    })
  })

})
