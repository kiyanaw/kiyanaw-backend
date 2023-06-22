
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
global.document.getSelection = function () {}
document.execCommand = function () {}

const Quill = require('quill')

const Parchment = Quill.import('parchment')
let KnownWord = new Parchment.Attributor.Class('known-word', 'known-word', {
  scope: Parchment.Scope.INLINE,
})
let IgnoreWord = new Parchment.Attributor.Class('ignore-word', 'ignore-word', {
  scope: Parchment.Scope.INLINE,
})
let IssueNeedsHelp = new Parchment.Attributor.Class('issue-needs-help', 'issue-needs-help', {
  scope: Parchment.Scope.INLINE,
})
let IssueIndexing = new Parchment.Attributor.Class('issue-indexing', 'issue-indexing', {
  scope: Parchment.Scope.INLINE,
})
let IssueNewWord = new Parchment.Attributor.Class('issue-new-word', 'issue-new-word', {
  scope: Parchment.Scope.INLINE,
})
let Suggestion = new Parchment.Attributor.Class('suggestion', 'suggestion', {
  scope: Parchment.Scope.INLINE,
})

let SuggestionKnown = new Parchment.Attributor.Class('suggestion-known', 'suggestion-known', {
  scope: Parchment.Scope.INLINE,
})

const transcribeFormats = [
  'known-word',
  'ignore-word',
  'issue-needs-help',
  'issue-indexing',
  'issue-new-word',
  'suggestion',
  'suggestion-known',
]

// const editor = new Quill(document.createElement('div'), { formats: transcribeFormats })
Parchment.register(KnownWord)
Parchment.register(IgnoreWord)
Parchment.register(IssueNeedsHelp)
Parchment.register(IssueIndexing)
Parchment.register(IssueNewWord)
Parchment.register(Suggestion)
Parchment.register(SuggestionKnown)

const createQuill = function () {
  return new Quill(document.createElement('div'), { formats: transcribeFormats })
}

module.exports = { createQuill }
