import Quill from 'quill'

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

const registerCustomQuillFormats = () => {
  Parchment.register(KnownWord)
  Parchment.register(IgnoreWord)
  Parchment.register(IssueNeedsHelp)
  Parchment.register(IssueIndexing)
  Parchment.register(IssueNewWord)
  Parchment.register(Suggestion)
  Parchment.register(SuggestionKnown)
}

const transcribeFormats = [
  'known-word',
  'ignore-word',
  'issue-needs-help',
  'issue-indexing',
  'issue-new-word',
  'suggestion',
  'suggestion-known',
]

const editor = new Quill(document.createElement('div'), { formats: transcribeFormats })
registerCustomQuillFormats()

const reconcileTextAndIssues = (contents, issues) => {
  // set contents in our fake editor
  editor.setContents(contents)
  // find the issue keys within the text in order to reconcile
  const contentIssueKeys = contents
    .map((item) => {
      if (item.attributes) {
        const out = []
        Object.values(item.attributes).forEach((value) => {
          if (value.startsWith('issue-')) {
            out.push(value)
          }
        })
        return out
      }
    })
    .filter(item => item)
    .flat()
  // take care of new issues
  const newIssues = issues.filter((issue) => !contentIssueKeys.includes(issue.id))
  newIssues.forEach((issue) => {
    editor.formatText(issue.index, issue.text.length, `issue-${issue.type}`, issue.id)
  })

  // used later to reconcile indexes
  const existingIssueMap = {}
  // remove old issues
  const existingIssueKeys = issues.map((item) => {
    existingIssueMap[item.id] = item
    return item.id
  })
  const deletedIssueIds = contentIssueKeys.filter((key) => !existingIssueKeys.includes(key))
  // check for resolved issues
  const resolvedIssueIds = issues.filter((issue) => issue.resolved).map((issue) => issue.id)
  const removeIds = deletedIssueIds.concat(resolvedIssueIds)
  removeIds.forEach((issueId) => {
    const issueType = issueId.split('-').slice(0, -1).join('-')
    const contents = editor.getContents().ops
    let index = 0
    for (const leaf of contents) {
      if (leaf.attributes && Object.values(leaf.attributes).includes(issueId)) {
        editor.formatText(index, leaf.insert.length, issueType, false)
        break
      }
      index += leaf.insert.length
    }
  })
  // reconcile indexes between content and issues
  let index = 0
  contents = editor.getContents().ops
  contents.forEach((leaf) => {
    if (leaf.attributes) {
      Object.values(leaf.attributes).forEach((value) => {
        if (value.includes('issue-')) {
          existingIssueMap[value].index = index
        }
      })
    }
    index = index + leaf.insert.length
  })

  return [contents, Object.values(existingIssueMap)]
}

export {
  reconcileTextAndIssues,
  registerCustomQuillFormats,
  transcribeFormats
}