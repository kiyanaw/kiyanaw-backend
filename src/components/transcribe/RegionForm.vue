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
          :disabled="(regionIsLocked && !regionIsLockedByMe) || !user"
          @click="onToggleRegionType"
          data-test="regionNoteButton"
        >
          <v-icon small> mdi-note-outline </v-icon>
        </v-btn>

        <v-btn small icon @click="onLock" :disabled="!user" data-test="regionLockButton">
          <v-icon small v-if="!regionIsLocked">mdi-lock-open-outline</v-icon>
          <v-icon small v-if="regionIsLocked" color="black">mdi-lock</v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || !user"
          @click="onCreateIssue"
          data-test="regionIssueButton"
        >
          <v-icon small> mdi-flag-outline </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || !user"
          @click="onIgnoreWord"
          data-test="ignoreWordButton"
        >
          <v-icon small> mdi-format-strikethrough-variant </v-icon>
        </v-btn>

        <v-btn
          small
          icon
          :disabled="!selectedRange || !user"
          @click="onClearFormat"
          data-test="clearFormatButton"
        >
          <v-icon small> mdi-cancel </v-icon>
        </v-btn>

        <v-btn small icon @click="onDeleteRegion" :disabled="!user" data-test="regionDeleteButton">
          <v-icon small> mdi-delete-forever </v-icon>
        </v-btn>
      </v-toolbar>
      <rte
        class="rte main-editor-container"
        ref="mainEditor"
        mode="main"
        :text="regionText"
        :disabled="(regionIsLocked && !regionIsLockedByMe) || !user"
        @change-content="onMainEditorContentChange"
        @change-format="onMainEditorFormatChange"
        @focus="onFocusDelayed"
        @blur="onBlur"
        @selection="onMainEditorSelection"
        v-if="!region.isNote"
      ></rte>

      <rte
        class="rte translation-editor-container"
        ref="secondaryEditor"
        mode="secondary"
        :text="regionTranslation"
        :disabled="(regionIsLocked && !regionIsLockedByMe) || !user"
        @change-content="onSecondaryEditorContentChange"
        @focus="onFocusDelayed"
        @blur="onBlur"
      ></rte>

      <v-form ref="regionForm">
        <v-text-field v-model="selectedRegion.id" disabled label="Region ID"></v-text-field>
        <v-text-field
          v-if="regionIsLocked"
          :value="selectedRegionLockuser"
          disabled
          label="Region lock"
        ></v-text-field>
        <v-text-field
          v-if="regionIsLocked"
          :value="selectedRegionExpiry"
          disabled
          label="Region lock expiry"
        ></v-text-field>
      </v-form>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Timeout from 'smart-timeout'

import RTE from './RTE.vue'
import Lexicon from '../../services/lexicon'
import logging from '../../logging'

/**
 * NOTE: the invalidate issues timing *must* be greater than the
 * set contents timing, or issues will be overridden.
 */
const SET_CONTENTS_TIMING = 10
const INVALIDATE_ISSUES_TIMING = SET_CONTENTS_TIMING + 5

const logger = new logging.Logger('Region Form')

export default {
  components: { rte: RTE },
  computed: {
    ...mapGetters(['locks', 'selectedIssue', 'selectedRegion', 'user']),

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

    regionIsLocked() {
      const regionId = this.selectedRegion.id
      return Object.keys(this.locks).includes(regionId)
    },

    selectedRegionLockuser() {
      return this.locks[this.selectedRegion.id].user
    },

    selectedRegionExpiry() {
      const deleteTime = this.locks[this.selectedRegion.id].deleteTime
      return deleteTime - +new Date() / 1000
    },

    regionIsLockedByMe() {
      const regionId = this.selectedRegion.id
      if (this.regionIsLocked) {
        return this.locks[regionId].user === this.user.name
      } else {
        return false
      }
    },
  },

  data() {
    return {
      currentSelection: null,
      selectedRange: null,
    }
  },

  watch: {
    locks(newValue) {
      logger.info('Lock changed', newValue)
    },

    issues(newValue) {
      if (!this.selectedRegion.isNote) {
        Timeout.clear('invalidate-issues-timer')
        Timeout.set(
          'invalidate-issues-timer',
          () => {
            this.doTriggerIssueInvalidation(newValue)
          },
          INVALIDATE_ISSUES_TIMING,
        )
      }
    },

    selectedRegion(region) {
      if (region) {
        logger.info('setting text for both editors', region.translation)
        /**
         * Micro-delay to allow editors to mount the first time.
         */
        setTimeout(() => {
          this.doSetEditorsContents(region)
        }, SET_CONTENTS_TIMING)
      }
    },
  },

  methods: {
    ...mapActions([
      'checkForLockedRegions',
      'deleteRegion',
      'lockRegion',
      'setSelectedIssue',
      'updateRegion',
      'unlockRegion',
    ]),

    onCreateIssue() {
      this.setSelectedIssue({
        id: null,
        type: 'needs-help',
        createdAt: +new Date(),
        index: this.selectedRange.index,
        text: this.selectedRange.text,
        comments: [],
        owner: this.user.name,
      })
      this.$emit('create-issue')
    },

    onIgnoreWord() {
      this.$refs.mainEditor.ignoreWord()
    },

    onClearFormat() {
      this.$refs.mainEditor.clearFormat()
    },

    onDeleteRegion() {
      if (confirm('Delete selected region?')) {
        this.deleteRegion()
      }
    },

    onLock() {
      if (this.regionIsLocked) {
        if (this.regionIsLockedByMe) {
          this.unlockRegion()
        }
      } else {
        this.attemptRegionLock()
      }
    },

    /**
     * Handle main editor content changes.
     */
    onMainEditorFormatChange(contents) {
      this.updateRegion({ text: contents })
    },

    onMainEditorContentChange(contents) {
      this.updateRegion({ text: contents })

      // additionally check for known words
      this.checkForKnownWords()
    },

    /**
     * Delayed wrapper for the onFocus handler, offset with a timeout of 10ms to ensure that
     * the order of events is always blur -> focus, since the changing of one editor to the
     * other would not want to trigger an unlock for this region.
     */
    onFocusDelayed() {
      Timeout.set(this.onFocus, 10)
    },

    onFocus() {
      logger.debug('Focus')
      Timeout.clear('unlock-region-timer')
      this.attemptRegionLock()
    },

    /**
     * This is disabled for now, we'll just keep the region locked until another region is selected.
     */
    onBlur() {
      //logger.debug('Blur')
      // Delay the unlock request in case we just switched editors
      // Timeout.set('unlock-region-timer', this.unlockRegion, 50)
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

    attemptRegionLock() {
      if (!this.regionIsLockedByMe) {
        this.lockRegion((result) => {
          if (!result) {
            logger.warn('Region lock failed')
            alert('Unable to lock region, try again shortly')
            this.$refs.mainEditor.blur()
            this.$refs.secondaryEditor.blur()
          }
        })
      }
    },

    /**
     * Quickly apply known words to the current region, then do a search on anything left over.
     */
    checkForKnownWords() {
      // clear out any typing changes
      this.applyKnownWords()

      // throttle word checking
      Timeout.clear('check-known-words-timer')
      Timeout.set(
        'check-known-words-timer',
        () => {
          const words = Object.keys(this.getTextMapFromDeltas(this.selectedRegion.text))
          logger.info('Words to check', words)

          // find the words we want to search for
          const knownWords = Lexicon.getKnownWords()
          const difference = words.filter((needle) => !knownWords.includes(needle))
          logger.info('Words to search for', difference)

          Lexicon.wordSearch(difference, this.applyKnownWords)
        },
        200,
      )
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
     * Wrapper for testing, calls the invalidate method on the main editor.
     */
    doTriggerIssueInvalidation(newValue) {
      this.$refs.mainEditor.validateIssues(newValue)
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
        if (map[clean] && map[clean].length) {
          map[clean] = [{ ...map[clean] }]
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
    async applyKnownWords() {
      // check for words to search
      const knownWords = Lexicon.getKnownWords()
      const wordMap = this.getTextMapFromDeltas(this.selectedRegion.text)
      const matches = Object.keys(wordMap).filter((needle) => knownWords.includes(needle))

      if (matches.length) {
        this.editorClearKnownWords()
        // notify main editor to adjust formatting
        for (const match of matches) {
          let bits = wordMap[match]
          if (!Array.isArray(bits)) {
            bits = [bits]
          }
          logger.info('Applying match', match, bits)
          bits.forEach((bit) => {
            this.editorApplyKnownWords(bit.index, bit.length)
          })
        }
      }
    },

    // wrapper for testing
    editorClearKnownWords() {
      this.$refs.mainEditor.clearKnownWords()
    },
    // wrapper for testing
    editorApplyKnownWords(index, length) {
      this.$refs.mainEditor.applyKnownWord(index, length)
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
