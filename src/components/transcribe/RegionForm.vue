<template>
  <div>
    <div v-if="!region"><h2>Please select a region</h2></div>

    <div v-if="region">
      <v-toolbar dense flat>
        <v-btn small icon>
          <v-icon> mdi-play-circle </v-icon>
        </v-btn>

        <v-btn
          icon
          small
          :disabled="regionIsLocked && !regionIsLockedByMe"
          @click="onToggleRegionType"
        >
          <v-icon small> mdi-note-outline </v-icon>
        </v-btn>
        <v-btn small icon @click="onLock">
          <v-icon small v-if="!regionIsLocked">mdi-lock-open-outline</v-icon>
          <v-icon small v-if="regionIsLocked" color="black">mdi-lock</v-icon>
        </v-btn>
        <v-btn small icon :disabled="!selectedRange" @click="onCreateIssue">
          <v-icon small> mdi-flag-outline </v-icon>
        </v-btn>
      </v-toolbar>
      <rte
        class="rte main-editor-container"
        ref="mainEditor"
        mode="main"
        :text="regionText"
        :disabled="regionIsLocked && !regionIsLockedByMe"
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
        :disabled="regionIsLocked && !regionIsLockedByMe"
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
      return [{ insert: this.region.translation }]
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

  mounted() {},

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
            /**
             * Issue invalidation *must* be delayed so that the editor contents can first.
             */
            this.$refs.mainEditor.validateIssues(newValue)
          },
          25,
        )
      }
    },

    selectedRegion(region) {
      logger.info('setting text for both editors', region.translation)
      /**
       * Micro-delay to allow editors to mount the first time.
       */
      setTimeout(() => {
        if (!region.isNote) {
          this.$refs.mainEditor.setContents(region.text)
        }
        this.$refs.secondaryEditor.setContents(region.translation)
      }, 10)
    },
  },

  methods: {
    ...mapActions([
      'checkForLockedRegions',
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

    onMainEditorSelection(range) {
      // logger.info('Main editor selection', range)
      if (range && range.length) {
        logger.info('length!')
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
            this.$refs.main.blur()
            this.$refs.secondary.blur()
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
        2000,
      )
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
      const original = text
      const map = {}
      const parts = text.trim().split(' ')
      for (const part of parts) {
        const index = original.indexOf(part)
        const clean = part.replace(/,|\[|\]|\.|\?|\n|\r| |\(|\)/gi, '')
        map[clean] = {
          original: part,
          length: part.length,
          index,
        }
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
        this.$refs.main.clearKnownWords()
        // notify main editor to adjust formatting
        for (const match of matches) {
          logger.info('Applying match', match)
          const index = wordMap[match].index
          const length = wordMap[match].length
          this.$refs.main.applyKnownWord(index, length)
        }
      }
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
