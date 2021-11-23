<template>
  <div>
    <v-menu v-model="showMenu" :position-x="x" :position-y="y" absolute offset-y>
      <v-list dense>
        <v-list-item v-for="(item, index) in sortedSuggestions" :key="index" @click="onSuggestion">
          <v-list-item-title>{{ item }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    <div :id="'editor-' + mode" :class="'editor-' + mode"></div>
  </div>
</template>

<script>
import Quill from 'quill'
// import QuillCursors from 'quill-cursors'
import { mapGetters } from 'vuex'
import Timeout from 'smart-timeout'

import logging from '../../logging'
import Lexicon from '@/services/lexicon'

const logger = new logging.Logger('RTE')

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

Parchment.register(KnownWord)
Parchment.register(IgnoreWord)
Parchment.register(IssueNeedsHelp)
Parchment.register(IssueIndexing)
Parchment.register(IssueNewWord)
Parchment.register(Suggestion)
Parchment.register(SuggestionKnown)
// Quill.register('modules/cursors', QuillCursors)

const formats = {
  main: [
    'known-word',
    'ignore-word',
    'issue-needs-help',
    'issue-indexing',
    'issue-new-word',
    'suggestion',
    'suggestion-known',
  ],
  secondary: [],
}

export default {
  props: ['disabled', 'mode', 'text', 'analyze'],
  data() {
    return {
      showMenu: true,
      x: 0,
      y: 0,
      suggestions: {},
      currentSuggestions: ['one'],
      suggestionRange: null,
    }
  },
  mounted() {
    logger.info('Editor mounted', this.mode, this.disabled)
    logger.info('Analyzer enabled', this.analyze)
    this.editor = null
    // toggle context menu once to fix first click bug
    this.showMenu = false

    if (!this.analyze) {
      formats.main = formats.main.filter((item) => !item.startsWith('known'))
    }

    const element = this.$el.querySelector('#editor-' + this.mode)
    this.element = element
    if (!this.editor) {
      this.editor = new Quill(element, {
        theme: 'snow',
        formats: formats[this.mode],
        modules: {
          toolbar: false,
          // cursors: true,
        },
        readOnly: false,
      })

      // this.cursors = this.editor.getModule('cursors')
      this.editor.root.setAttribute('spellcheck', false)
      this.setContents(this.text)

      this.editor.on('text-change', this.onChange)
      this.editor.on('selection-change', this.onSelection)

      window[`${this.mode}Editor`] = this.editor

      if (this.disabled) {
        logger.info('Disabling editor on mount')
        this.editor.disable()
      }
    }
  },

  methods: {
    onChange(delta, oldDelta, source) {
      // Only emit user changes
      if (source === 'user') {
        this.maybeAddASpaceAtTheEnd()

        // throttle updates a little
        Timeout.clear('rte-change-timeout')
        Timeout.set(
          'rte-change-timeout',
          () => {
            this.emitChangeEvent('change-content')
          },
          100,
        )
      }
    },

    onSelection(range) {
      if (!this.disabled) {
        logger.debug('Selection change', this.mode, range)
        if (range) {
          this.$emit('focus')
          // tack on the text for this event
          range.text = this.editor.getText(range.index, range.length)
          this.$emit('selection', range)

          this.checkForSuggestions(range)
        } else {
          this.$emit('blur')
        }
      }
    },

    // invoked externally when region is locked
    blur() {
      this.editor.blur()
    },

    setContents(value) {
      // don't let null values in
      value = value || ''
      if (!Array.isArray(value)) {
        value = [{ insert: value }]
      }
      // filter out nulls (fixing bad data)
      value = value.filter((item) => !!item.insert)
      try {
        logger.debug('setting contents', this.mode, value)
        this.editor.setContents(value, 'silent')
      } catch (error) {
        logger.warn('Unable to set text contents:', error.message)
      }
      // clear out suggestions
      this.suggestions = {}
      this.currentSuggestions = []
      this.suggestionRange = null
    },

    clearKnownWords() {
      this.editor.formatText(0, 9999, 'known-word', false)
    },

    clearSuggestions() {
      this.editor.formatText(0, 9999, 'suggestions', false)
    },

    ignoreWord() {
      this.editor.format('ignore-word', true)
      this.emitChangeEvent('change-format')
    },

    clearFormat() {
      const range = this.editor.getSelection()
      this.editor.removeFormat(range.index, range.length)
      this.emitChangeEvent('change-format')
    },

    applyKnownWord(index, length) {
      if (!this.analyze) {
        return
      }
      this.editor.formatText(index, length, 'known-word', true)
      this.editor.formatText(index, length, 'suggestion', false)
      // trigger change for save
      logger.debug('apply known word', index, length)
      this.emitChangeEvent('change-format')
    },

    applyKnownHint(index, length) {
      if (!this.analyze) {
        return
      }
      logger.debug('applying known hint', index, length)
      // check for known-word
      const currentFormat = this.editor.getFormat(index, length)
      if (Object.keys(currentFormat).indexOf('known-word') === -1) {
        this.editor.formatText(index, length, 'suggestion-known', true, 'silent')
      }
    },

    applySuggestion(index, length) {
      if (!this.analyze) {
        return
      }
      logger.debug('applying suggestion', index, length)
      const currentFormat = this.editor.getFormat(index, length)
      if (Object.keys(currentFormat).indexOf('ignore-word') === -1) {
        this.editor.formatText(index, length, 'suggestion', true, 'silent')
      }
    },

    setSuggestions(suggestions) {
      logger.debug('set suggestions', suggestions)
      this.suggestions = suggestions
    },

    checkForSuggestions(range) {
      if (!this.analyze) {
        return
      }
      logger.debug('checking for suggestions', range)
      const [blot] = this.editor.getLeaf(range.index)
      logger.debug('blot', blot)
      if (blot.domNode instanceof HTMLBRElement) {
        return
      }
      const text = Lexicon.replaceMacrons(blot.text)
      const cleanText = text.replace(/[.,()]/g, '')
      logger.debug('leaf', blot, text)
      const index = this.editor.getIndex(blot)
      logger.debug('suggestions', Object.keys(this.suggestions))
      logger.debug('cleanText', cleanText)

      if (Object.keys(this.suggestions).indexOf(cleanText) > -1) {
        logger.debug('we have suggestions!')
        this.suggestionRange = { index, length: text.length }

        const targetWordBounds = this.getBounds({
          index,
          length: text.length,
        })
        logger.debug('bounds', targetWordBounds)
        this.x = Number(targetWordBounds.left)
        this.y = Number(targetWordBounds.top + 25)
        this.showMenu = false
        this.currentSuggestions = this.suggestions[cleanText]
        this.$nextTick(() => {
          logger.debug('showing the menu')
          this.showMenu = true
        })
      }
    },

    getBounds(range) {
      const editorBounds = this.element.getBoundingClientRect()
      const rangeBounds = this.editor.getBounds(range)
      return {
        top: editorBounds.top + rangeBounds.top,
        left: editorBounds.left + rangeBounds.left,
      }
    },

    onSuggestion(event) {
      const newText = event.target.innerText
      this.editor.deleteText(this.suggestionRange.index, this.suggestionRange.length, 'api')
      this.editor.insertText(this.suggestionRange.index, newText, 'api')
      this.emitChangeEvent('change-content')
    },

    /**
     * Checks the editor to see if there is a space at the end of the text, adds one if not. This is
     * to allow for typing at the end of the text outside of any existing formatting.
     */
    maybeAddASpaceAtTheEnd() {
      // check to see if there is a space at the end of the text
      const contents = this.editor.getText()
      const characters = contents.split('')
      characters.pop() // remove the newline
      const lastItemIndex = characters.length
      const lastItem = characters.pop()
      if (lastItem !== ' ') {
        this.editor.insertText(lastItemIndex, ' ', 'api')
        this.editor.removeFormat(lastItemIndex, lastItemIndex + 1, 'api')
      }
    },

    /**
     * Will signal that the editor has changed and needs to be saved.
     */
    emitChangeEvent(event) {
      let contents = this.editor.getContents().ops
      // strip out any 'suggestion' markup
      contents = contents.map((item) => {
        if (item.attributes) {
          delete item.attributes.suggestion
          delete item.attributes['suggestion-known']
        }
        return item
      })
      this.$emit(event, contents)
    },

    validateIssues(issues) {
      const contents = this.editor.getContents().ops
      const existingIds = contents
        .map((item) =>
          Object.values(item.attributes || {}).filter((value) => value.startsWith('issue')),
        )
        .flat()

      // incoming issues
      const newIssues = issues
        .filter((issue) => !issue.resolved)
        .filter((issue) => !existingIds.includes(issue.id))

      for (const issue of newIssues) {
        this.addIssue(issue)
      }

      // deleted or resolved issues
      const goodIssueIds = issues.filter((issue) => !issue.resolved).map((issue) => issue.id)
      const deleted = existingIds.filter((id) => !goodIssueIds.includes(id))
      for (const issueId of deleted) {
        this.removeIssue(issueId)
      }
    },

    addIssue(issue) {
      logger.info('Adding issue', issue)
      // creates the class .issue-needs-help-1234567890
      this.editor.formatText(issue.index, issue.text.length, `issue-${issue.type}`, issue.id)
      this.emitChangeEvent('change-format')
    },

    removeIssue(issueId) {
      logger.info('removing issueId', issueId)
      const issueType = issueId.split('-').slice(0, -1).join('-')
      const contents = this.editor.getContents().ops
      let index = 0
      for (const leaf of contents) {
        if (leaf.attributes && Object.values(leaf.attributes).includes(issueId)) {
          this.editor.formatText(index, leaf.insert.length, issueType, false)
          break
        }
        index += leaf.insert.length
      }
      this.emitChangeEvent('change-format')
    },
  },

  computed: {
    ...mapGetters(['selectedRegion']),
    sortedSuggestions() {
      return this.currentSuggestions.sort()
    },
  },

  watch: {
    disabled(disable) {
      logger.info('Disable editor: ', disable)
      if (disable) {
        this.editor.disable()
      } else {
        this.editor.enable()
      }
    },

    /**
     * A hook to change the editor text only when the region changes.
     */
    // selectedRegion() {
    //   logger.info('selectionRegion changed!', this.text)
    //   this.setContents(this.selectedRegion.text)
    // },
  },
}
</script>

<style scoped>
.ql-container {
  font-size: 20px;
  height: 150px;
}
.ql-container.ql-snow {
  border: none;
  padding: 0px 0;
}
</style>
