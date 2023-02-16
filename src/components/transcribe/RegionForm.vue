<template>
  <div>
    <div v-if="!region"><h2>Please select a region</h2></div>

    <div v-if="region">
      <v-toolbar dense flat>
        <v-btn small icon @click="onPlayRegion" data-test="regionPlayButton">
          <v-icon> mdi-play-circle </v-icon>
        </v-btn>

        <v-btn
          icon
          small
          :disabled="disableInputs"
          @click="onToggleRegionType"
          data-test="regionNoteButton"
        >
          <v-icon small> mdi-note-outline </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || disableInputs"
          @click="onNavigateToCreateIssueForm"
          data-test="regionIssueButton"
        >
          <v-icon small> mdi-flag-outline </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || disableInputs"
          @click="onIgnoreWord"
          data-test="ignoreWordButton"
        >
          <v-icon small> mdi-eye-off </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || disableInputs"
          @click="onClearFormat"
          data-test="clearFormatButton"
        >
          <v-icon small> mdi-cancel </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          @click="onDeleteRegion"
          :disabled="disableInputs"
          data-test="regionDeleteButton"
        >
          <v-icon small> mdi-delete-forever </v-icon>
        </v-btn>
      </v-toolbar>
      <rte
        class="rte main-editor-container"
        ref="mainEditor"
        mode="main"
        :analyze="!transcription.disableAnalyzer"
        :text="regionText"
        :disabled="disableInputs"
        @change-content="onMainEditorContentChange"
        @change-format="onMainEditorFormatChange"
        @selection="onMainEditorSelection"
        v-if="!region.isNote"
      ></rte>

      <rte
        class="rte translation-editor-container"
        ref="secondaryEditor"
        mode="secondary"
        :text="regionTranslation"
        :disabled="disableInputs"
        @change-content="onSecondaryEditorContentChange"
      ></rte>

      <v-form ref="regionForm">
        <v-text-field v-model="selectedRegion.id" disabled label="Region ID"></v-text-field>
      </v-form>
    </div>

    <div class="ql-container">
      <div class="ql-cursor">
        <div class="ql-cursor-flag">
          <div class="ql-cursor-name"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Timeout from 'smart-timeout'

import RTE from './RTE.vue'
import Lexicon from '../../services/lexicon'

import logging from '../../logging'
const logger = new logging.Logger('Region Form')

/**
 * NOTE: the invalidate issues timing *must* be greater than the
 * set contents timing, or issues will be overridden.
 */
const SET_CONTENTS_TIMING = 25

export default {
  components: { rte: RTE },
  computed: {
    ...mapGetters(['selectedIssue', 'selectedRegion', 'transcription', 'user']),

    /**
     * Disable inputs if not EDITOR
     */
    disableInputs() {
      if (this.user) {
        return !this.transcription.editors.includes(this.user.name)
      } else {
        return true
      }
    },
    issues() {
      if (this.selectedRegion) {
        return this.selectedRegion.issues || []
      }
      return []
    },

    region() {
      return this.selectedRegion
    },

    regionText() {
      return this.selectedRegion.text
    },

    regionTranslation() {
      return [{ insert: this.selectedRegion.translation }]
    },
  },

  mounted() {
  },

  data() {
    return {
      currentSelection: null,
      selectedRange: null,
    }
  },

  watch: {
    // TODO: this needs tests, only update the region if it has changed
    selectedRegion(newRegion, oldRegion) {
      let updateContents = true
      if (newRegion) {
        if (oldRegion && oldRegion.id === newRegion.id) {
          updateContents = false
        }
      }
      if (updateContents) {
        logger.debug('setting text for both editors', newRegion.translation)
        /**
         * Micro-delay to allow editors to mount the first time.
         */
        setTimeout(() => {
          this.doSetEditorsContents(newRegion)
          this.checkForKnownWords(false)
        }, SET_CONTENTS_TIMING)
      }
    },
  },

  methods: {
    ...mapActions([
      'deleteRegion',
      'setSelectedIssue',
      'updateRegion',
    ]),

    onNavigateToCreateIssueForm() {
      this.setSelectedIssue({
        id: null,
        type: 'needs-help',
        createdAt: +new Date(),
        index: this.selectedRange.index,
        text: this.selectedRange.text,
        comments: [],
        owner: this.user.name,
      })
      this.$emit('show-create-issue-form')
    },

    onIgnoreWord() {
      this.$refs.mainEditor.ignoreWord()
    },

    onClearFormat() {
      this.$refs.mainEditor.clearFormat()
    },

    onDeleteRegion() {
      const regionId = this.selectedRegion.id
      if (confirm('Delete selected region?')) {
        this.deleteRegion(regionId)
      }
    },

    /**
     * Handle main editor content changes.
     */
    onMainEditorFormatChange(contents) {
      this.updateRegion({ text: contents })
    },

    onMainEditorContentChange(contents) {
      // console.log('!! update region called')
      this.updateRegion({ text: contents })

      // additionally check for known words
      this.checkForKnownWords(true)
    },

    onPlayRegion() {
      this.$emit('play-region', this.selectedRegion.id)
    },

    onMainEditorSelection(range) {
      if (range && range.length) {
        this.selectedRange = range
      } else {
        this.selectedRange = null
      }
    },

    onSecondaryEditorContentChange(contents) {
      const text = contents.map((item) => item.insert).join('')
      logger.debug('translation changed', text)
      this.updateRegion({ translation: text })
    },

    onToggleRegionType() {
      const existingTextLength = this.selectedRegion.text.map((item) => item.insert).join('').length
      if (existingTextLength) {
        alert('Cannot convert non-empty region to note!')
        return
      }
      this.updateRegion({ isNote: !this.selectedRegion.isNote })
    },

    /**
     * Quickly apply known words to the current region, then do a search on anything left over.
     */
    checkForKnownWords(doUpdate = false) {
      logger.debug(`Checking for known words in editor, (doUpdate: ${doUpdate})`)
      if (this.transcription.disableAnalyzer || this.selectedRegion.isNote) {
        return
      }
      // clear out any typing changes
      this.applyKnownWords(doUpdate)

      // throttle word checking
      Timeout.clear('check-known-words-timer')
      Timeout.set(
        'check-known-words-timer',
        () => {
          const words = Object.keys(this.getTextMapFromDeltas(this.selectedRegion.text))
          logger.debug('Words to check', words)

          // find the words we want to search for
          const knownWords = Lexicon.getKnownWords()
          const difference = words.filter((needle) => !knownWords.includes(needle))
          logger.debug('Words to search for', difference)

          Lexicon.wordSearch(difference, () => {
            this.applyKnownWords(doUpdate)
            this.applySuggestions()
          })
        },
        750,
      )
    },

    /**
     * Apply known words from the Lexicon to the current editor.
     */
    async applyKnownWords(doUpdate = false) {
      logger.debug(`applyKnownWords, (doUpdate: ${doUpdate})`)
      // check for words to search
      const knownWords = Lexicon.getKnownWords()
      const wordMap = this.getTextMapFromDeltas(this.selectedRegion.text)
      const matches = Object.keys(wordMap).filter((needle) => knownWords.includes(needle))

      if (matches.length) {
        let applyFunc
        if (!doUpdate) {
          // hint known word
          applyFunc = this.editorApplyKnownHint
        } else {
          logger.debug('Should! clear known words')
          this.editorClearKnownWords()
          applyFunc = this.editorApplyKnownWords
        }
        // notify main editor to adjust formatting
        for (const match of matches) {
          let bits = wordMap[match]
          if (!Array.isArray(bits)) {
            bits = [bits]
          }
          logger.debug('Applying match', match, bits)
          bits.forEach((bit) => {
            // either highlight known words, or apply hints
            applyFunc(bit.index, bit.length)
          })
        }
      } else {
        this.editorClearKnownWords()
      }
    },

    /**
     * Wrapper for testing, sets the main editor contents.
     */
    doSetEditorsContents(region) {
      if (!region.isNote) {
        this.$refs.mainEditor.setContents(region.text)
      }
      this.$refs.secondaryEditor.setContents(region.translation)
    },

    /**
     * Turns this
     *  '[kā-miyo-kīsikwiw kīhikāw?] \n'
     *
     * Into a usable lookup so we can highlight words that even have special characters
     *
     * {
     *  'kā-miyo-kīsikwiw': { original: '[kā-miyo-kīsikwiw', index: 0, length: 17 },
     *  'kīhikāw': { original: 'kīhikāw?]', index: 18, length: 9 },
     * }
     *
     * This will allow us to highlight lookups with assumed spellings, eg:
     *
     *   (ki)ka-nakiskâtonaw
     *
     * See tests for more details region-form.spec.js
     */
    getTextMapFromDeltas(deltas) {
      let text = ''
      for (const item of deltas) {
        text += item.insert
      }

      // 'this i[s] some, text'
      let original = text
      const map = {}
      const parts = text.trim().split(' ')
      for (const part of parts) {
        const index = original.indexOf(part)
        const clean = part.replace(/,|\[|\]|\.|\?|\n|\r| |\(|\)|"/gi, '')
        if (map[clean]) {
          if (!Array.isArray(map[clean])) {
            map[clean] = [{ ...map[clean] }]
          }
          map[clean].push({
            original: part,
            length: part.length,
            index,
          })
        } else {
          map[clean] = {
            original: part,
            length: part.length,
            index,
          }
        }

        // replace original ocurrance to handle duplicates
        const filler = new Array(part.length + 1).join('-')
        original = original.replace(part, filler)
      }

      return map
    },

    /**
     * Apply known words from the Lexicon to the current editor.
     */
    async applySuggestions() {
      logger.debug('checking for suggestions')
      // check for words to search
      const suggestionMap = Lexicon.getSuggestions()
      const suggestions = Object.keys(suggestionMap)
      const wordMap = this.getTextMapFromDeltas(this.selectedRegion.text)
      const matches = Object.keys(wordMap).filter((needle) =>
        suggestions.includes(Lexicon.replaceMacrons(needle)),
      )
      if (matches.length) {
        this.editorClearSuggestions()
        // notify main editor to adjust formatting
        for (const match of matches) {
          let bits = wordMap[match]
          if (!Array.isArray(bits)) {
            bits = [bits]
          }
          logger.debug('Applying suggestion', match, bits)
          bits.forEach((bit) => {
            this.editorApplySuggestion(bit.index, bit.length)
          })
        }
        this.editorSetSuggestions(suggestionMap)
      }
    },

    // wrapper for testing
    editorClearKnownWords() {
      this.$refs.mainEditor.clearKnownWords()
    },
    // wrapper for testing
    editorClearSuggestions() {
      this.$refs.mainEditor.clearSuggestions()
    },
    // wrapper for testing
    editorApplyKnownWords(index, length) {
      this.$refs.mainEditor.applyKnownWord(index, length)
    },
    // wrapper for testing
    editorApplyKnownHint(index, length) {
      this.$refs.mainEditor.applyKnownHint(index, length)
    },
    // wrapper for testing
    editorApplySuggestion(index, length) {
      this.$refs.mainEditor.applySuggestion(index, length)
    },

    editorSetSuggestions(suggestions) {
      this.$refs.mainEditor.setSuggestions(suggestions)
    },
  },
}
</script>

<style scoped>
.rte {
  border: 1px solid #ccc;
}

.translation-editor-container {
  background-color: #f5f5f5;
  color: grey;
}


</style>
