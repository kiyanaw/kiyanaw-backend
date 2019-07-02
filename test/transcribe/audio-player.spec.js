import assert from 'assert'
import sinon from 'sinon'
import { shallowMount } from '@vue/test-utils'
import TranscriptionService from '@/services/transcriptions'
import Transcribe from '@/components/transcribe/Transcribe.vue'

import data from './data/transcribe-data.json'

// const loadData = 
const $route = {
  path: '/transcribe-edit/',
  params: {
    id: 'someid12345'
  }
}

// function getRenderedText (Component, propsData) {
//   const Constructor = Vue.extend(Component)
//   const vm = new Constructor({ propsData: propsData }).$mount()
//   return vm.$el.textContent
// }

describe('components/Transcribe', function() {
  it('should set up default state using route params', async function () {
    const loadStub = sinon.stub(TranscriptionService, 'getTranscription')
    loadStub.resolves(data)
    const wrapper = shallowMount(Transcribe, {mocks: {$route}})
    // let load() resolve
    await new Promise(function (resolve) {setTimeout(resolve, 5)})
    const rendered = wrapper.vm
    assert.deepStrictEqual(loadStub.args[0], ['someid12345'])
    assert.strictEqual(rendered.title, 'This is my title')
    assert.strictEqual(rendered.audioFile, 'https://some.url/foobar.mp3')

  })
});