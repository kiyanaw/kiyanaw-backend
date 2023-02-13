const assert = require('assert')
const sinon = require('sinon')
const shims = require('@shopify/polyfills/mutation-observer.browser')

// fudge the DOM for Quill.js
require('jsdom-global')()
global.MutationObserver = class {
  constructor(callback) {}
  disconnect() {}
  observe(element, initObject) {}
  takeRecords() {
    return []
  }
}
global.document.getSelection = sinon.stub()
document.execCommand = sinon.stub()

// import Quill helper after dom-fudging
const helpers = require('../../src/helpers')

describe('helpers', function () {
  
  before(function () {
    // register custom formats
    helpers.registerCustomQuillFormats()
  })


  beforeEach(function () {
    this.sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  describe('reconcileTextAndIssues', function () {

    it('should return text and issues if no discrepancies found', function () {
      const inputText = [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: '\n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739598',
          type: 'needs-help',
          createdAt: '1593202739598',
          resolved: false,
          owner: 'bengodden',
          text: 'wī-kī-kāsōs',
          comments: [],
          index: 6,
        },
      ]
      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)

      assert.deepEqual(text, inputText)
      assert.deepEqual(issues, inputIssues)
    })

    it('should add an issue to the text', function () {
      const inputText = [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' ' },
        { insert: 'foobado soomaro' },
        { insert: '\n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739598',
          type: 'needs-help',
          createdAt: '1593202739598',
          resolved: false,
          owner: 'bengodden',
          text: 'wī-kī-kāsōs',
          comments: [],
          index: 6,
        },
        {
          id: 'issue-needs-help-1593202739599',
          type: 'needs-help',
          createdAt: '1593202739599',
          resolved: false,
          owner: 'bengodden',
          text: 'foobado',
          comments: [],
          index: 18,
        },
      ]

      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)

      assert.deepEqual(text, [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739599' },
          insert: 'foobado'
        },
        { insert: ' soomaro\n' },
      ])
      assert.deepEqual(issues, inputIssues)
    })

    it('should remove an issue from the text', function () {
      const inputText = [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739599' },
          insert: 'foobado',
        },
        { insert: ' soomaro\n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739599',
          type: 'needs-help',
          createdAt: '1593202739599',
          resolved: false,
          owner: 'bengodden',
          text: 'foobado',
          comments: [],
          index: 18,
        },
      ]

      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)

      assert.deepEqual(text, [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' wī-kī-kāsōs ' }, 
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739599' },
          insert: 'foobado',
        },
        { insert: ' soomaro\n' },
      ])
      assert.deepEqual(issues, inputIssues)
    })

    it('should refresh the issue indexes if the text changes', function () {
      const inputText = [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiswē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739599' },
          insert: 'foobado',
        },
        { insert: ' soomaro\n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739598',
          type: 'needs-help',
          createdAt: '1593202739598',
          resolved: false,
          owner: 'bengodden',
          text: 'wī-kī-kāsōs',
          comments: [],
          index: 6,
        },
        {
          id: 'issue-needs-help-1593202739599',
          type: 'needs-help',
          createdAt: '1593202739599',
          resolved: false,
          owner: 'bengodden',
          text: 'foobado',
          comments: [],
          index: 18,
        },
      ]
      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)
      // should have bumped each of the indexes by 1
      assert.equal(issues[0].index, 7)
      assert.equal(issues[1].index, 19)
    })

    it('should unformat text for resolved issues', function () {
      const inputText = [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739599' },
          insert: 'foobado',
        },
        { insert: ' soomaro\n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739598',
          type: 'needs-help',
          createdAt: '1593202739598',
          resolved: false,
          owner: 'bengodden',
          text: 'wī-kī-kāsōs',
          comments: [],
          index: 6,
        },
        {
          id: 'issue-needs-help-1593202739599',
          type: 'needs-help',
          createdAt: '1593202739599',
          resolved: true,
          owner: 'bengodden',
          text: 'foobado',
          comments: [],
          index: 18,
        },
      ]

      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)

      assert.deepEqual(text, [
        { attributes: { 'known-word': 'true' }, insert: 'ēyiwē' },
        { insert: ' ' },
        {
          attributes: { 'issue-needs-help': 'issue-needs-help-1593202739598' },
          insert: 'wī-kī-kāsōs',
        },
        { insert: ' foobado soomaro\n' },
      ])
      assert.deepEqual(issues, inputIssues)
    })

    xit('regression case', function () {
      const inputText = [
        { insert: 'This is some text here \n \n' },
      ]
      const inputIssues = [
        {
          id: 'issue-needs-help-1593202739598',
          type: 'needs-help',
          createdAt: '1593202739598',
          resolved: false,
          owner: 'bengodden',
          text: 'text',
          comments: [],
          index: 13,
        },
        {
          id: 'issue-needs-help-1593202739599',
          type: 'needs-help',
          createdAt: '1593202739599',
          resolved: false,
          owner: 'bengodden',
          text: 'is',
          comments: [],
          index: 5,
        },
      ]
      const [text, issues] = helpers.reconcileTextAndIssues(inputText, inputIssues)
      // should have bumped each of the indexes by 1
      console.log(text, issues)
    })

  })
})