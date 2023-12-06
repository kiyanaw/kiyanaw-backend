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
import Delta from 'quill-delta'
import QuillCursors from 'quill-cursors'
import { mapGetters } from 'vuex'
import Timeout from 'smart-timeout'

Quill.register('modules/cursors', QuillCursors);
window.Quill = Quill
window.Timeout = Timeout 
window.Delta = Delta

import { transcribeFormats } from '../../helpers'
import logging from '../../logging'
import Lexicon from '@/services/lexicon'
import EventBus from '@/store/bus'

const logger = new logging.Logger('RTE')

const formats = {
  main: transcribeFormats,
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
      currentSuggestions: [],
      suggestionRange: null,
    }
  },
  mounted() {
    logger.debug('Editor mounted', this.mode, this.disabled)
    logger.debug('Analyzer enabled', this.analyze)
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
          cursors: {
            hideDelayMs: 5000,
            transformOnTextChange: true
          },
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
        logger.debug('Disabling editor on mount')
        this.editor.disable()
      } else {
        // listen for realtime changes
        EventBus.$on('realtime-region-update', (incoming) => {
          if (this.mode === 'main') {
            const incomingText = new Delta(incoming.text)
            const local = this.editor.getText()
            const difference = local.diff(incomingText)
            this.editor.updateContents(difference, 'api')

          } else {
            const localValue = this.editor.getText()
            if (incoming.translation !== localValue) {
              this.editor.setText(incoming.translation, 'api')
            }
          }
        })
        // listen for realtime cursors
        EventBus.$on('realtime-cursor', (event) => {
          // console.log('rte cursor', event)
          // const cursorColor = remoteCursors[event.user].color
          if (event.regionId === this.selectedRegion.id) {
            // determine which mode we're in
            const mode = event.cursor.editor
            if (mode === this.mode) {
              // update the cursor
              this.cursors.createCursor(event.user, event.user, event.color)
              this.cursors.moveCursor(event.user, event.cursor)
              // this.cursors.toggleFlag(event.user, true)
            } else {
              this.cursors.removeCursor(event.user)
            }
          }
        })

        // listen for new issues, update text
        EventBus.$on('refresh-local-text', (text) => {
          console.log('refresh local text', text)
          if (this.mode === 'main') {
            const incomingText = new Delta(text)
            const local = this.editor.getText()
            const difference = local.diff(incomingText)
            this.editor.updateContents(difference, 'api')
          }
        })
      }
    }
  },

  methods: {
    onChange(delta, oldDelta, source) {
      // Only emit user changes
      if (source === 'user') {
        logger.debug('user change', delta)
        // remove this because probably not needed with text-only input
        // this.maybeAddASpaceAtTheEnd()

        // throttle updates a little
        Timeout.clear('rte-change-timeout')
        Timeout.set(
          'rte-change-timeout',
          () => {
            this.emitChangeEvent('change-content')
          },
          10,
        )
      }
    },

    onSelection(range) {
      // logger.info('onselection', range)
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
        // dispatch user cursor
        this.$store.dispatch('updateUserCursor', {
          ...range,
          editor: this.mode
        })
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
      this.currentSuggestions = ['one', 'three']
      this.suggestionRange = null
    },

    clearKnownWords() {
      logger.debug('clear known words')
      this.editor.formatText(0, 9999, 'known-word', false)
    },

    clearSuggestions() {
      logger.debug('clear suggestions')
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

    applyIssue(index, length, type) {
      console.log('applying format for issue', type)
      this.editor.formatText(index, length, `issue-${type}`, true)
    },

    applyKnownWord(index, length) {
      if (!this.analyze) {
        return
      }
      this.editor.formatText(index, length, 'known-word', true)
      this.editor.formatText(index, length, 'suggestion', false)
      // trigger change for save
      logger.debug('apply known word', index, length)
      // this.emitChangeEvent('change-format')
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
        setTimeout(() => {
          this.showMenu = true
          logger.debug('showing the menu', this.showMenu)
        }, 30)
      }
    },

    /**
     * Helper to figure out where to render the dropdown for suggestions.
     */
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
    // maybeAddASpaceAtTheEnd() {
    //   // check to see if there is a space at the end of the text
    //   const contents = this.editor.getText()
    //   const characters = contents.split('')
    //   characters.pop() // remove the newline
    //   const lastItemIndex = characters.length
    //   const lastItem = characters.pop()
    //   if (lastItem !== ' ') {
    //     this.editor.insertText(lastItemIndex, ' ', 'api')
    //     this.editor.removeFormat(lastItemIndex, lastItemIndex + 1, 'api')
    //   }
    // },

    /**
     * Will signal that the editor has changed and needs to be saved.
     */
    emitChangeEvent(event) {
      this.$emit(event, this.editor.getText())
    },

  },

  computed: {
    ...mapGetters(['selectedRegion', 'editingUsers']),
    sortedSuggestions() {
      return this.currentSuggestions.sort()
    },
  },

  watch: {
    disabled(disable) {
      logger.debug('Disable editor: ', disable)
      if (disable) {
        this.editor.disable()
      } else {
        this.editor.enable()
      }
    },

    selectedRegion(region) {
      const userDetails = this.editingUsers[region.id]
      if (userDetails && userDetails.length) {
        // we have cursor details
        userDetails.forEach((event) => {
          if (event.editor === this.mode) {
            this.cursors.createCursor(event.user, event.user, event.color)
            this.cursors.moveCursor(event.user, event.cursor)
          }
        })
      } else {
        // no cursor
        this.cursors.clearCursors()
      }
    }

  },
}
</script>


<style>
.ql-container {
  font-size: 20px;
  height: 150px;
}
.ql-container.ql-snow {
  border: none;
  padding: 0px 0;
}

.ql-cursor .ql-cursor-flag {
  line-height: 12px;
  padding: 2px;
}
.ql-cursor .ql-cursor-flag .ql-cursor-name {
  font-size: 75%;
}
</style>