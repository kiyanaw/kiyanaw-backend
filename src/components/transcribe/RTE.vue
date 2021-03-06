<template>
  <div>
    <div :id="'editor-' + mode" :class="'editor-' + mode"></div>
  </div>
</template>

<script>
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import { mapGetters } from 'vuex'
import Timeout from 'smart-timeout'

import logging from '../../logging'
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

Parchment.register(KnownWord)
Parchment.register(IgnoreWord)
Parchment.register(IssueNeedsHelp)
Parchment.register(IssueIndexing)
Parchment.register(IssueNewWord)
Quill.register('modules/cursors', QuillCursors)

const formats = {
  main: ['known-word', 'ignore-word', 'issue-needs-help', 'issue-indexing', 'issue-new-word'],
  secondary: [],
}

export default {
  props: ['disabled', 'mode', 'text'],
  mounted() {
    logger.debug('Editor mounted', this.mode)
    this.editor = null

    const element = this.$el.querySelector('#editor-' + this.mode)
    if (!this.editor) {
      this.editor = new Quill(element, {
        theme: 'snow',
        formats: formats[this.mode],
        modules: {
          toolbar: false,
          cursors: true,
        },
        readOnly: false,
      })

      this.cursors = this.editor.getModule('cursors')
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
        // throttle updates a little
        Timeout.clear('rte-change-timeout')
        Timeout.set(
          'rte-change-timeout',
          () => {
            logger.debug('contents changed', delta)
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
      if (!Array.isArray(value)) {
        value = [{ insert: value }]
      }
      try {
        this.editor.setContents(value, 'silent')
      } catch (error) {
        logger.warn('Unable to set text contents:', error.message)
      }
    },

    clearKnownWords() {
      this.editor.formatText(0, 9999, 'known-word', false)
    },

    applyKnownWord(index, length) {
      this.editor.formatText(index, length, 'known-word', true)
      // trigger change for save
      logger.debug('formatting changed')
      this.emitChangeEvent('change-format')
    },

    /**
     * Will signal that the editor has changed and needs to be saved.
     */
    emitChangeEvent(event) {
      const contents = this.editor.getContents().ops
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
