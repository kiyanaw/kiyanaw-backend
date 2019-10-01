<template>
  <v-container>
    <v-layout class="region-editor-layout"
      v-bind:class="{ inRegion: isInRegion, review: needsReview }"
      style="position: relative">
      <span class="region-index">{{ index }}</span>
      <v-flex xs2 md1 v-on:click="playRegion">
        <div class="timestamps">
          <span class="time region-start">{{ normalTime(start) }}</span><br />
          <span class="time region-end">{{ normalTime(end) }}</span>
        </div>
      </v-flex>

      <v-flex xs9 md10>
        <div>
          <div v-bind:id="'editor-' + regionId"></div>
        </div>
      </v-flex>

      <v-flex md1 xs1>
      </v-flex>
    </v-layout>

    <v-layout class="region-options-layout">
      <v-flex xs2 md1><!-- spacer --></v-flex>

      <v-flex xs10 md10>
          <div class="region-options" v-if="translation && (!editing || !canEdit)">{{ translation.trim() }}</div>
          <div class="region-options-edit" v-if="editing && canEdit">
            <span class="region-options-label">Translation</span>
            <div id="translation"></div>
            <span class="region-options-label">Options</span>
            <div class="region-options-controls">
              <a v-on:click="deleteRegion">Delete this region</a>
            </div>
          </div>
      </v-flex>
    </v-layout>

  </v-container>
</template>

<script>
import sha1 from 'js-sha1'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import utils from './utils'
import Lex from '../../services/lexicon'

/**
 * Register our custom class attributor. This is used to flag a word as
 * a 'known word', when it matches a word in the lexicon.
 */
const Parchment = Quill.import('parchment')
let KnownWord = new Parchment.Attributor.Class('known-word', 'known-word', {
  scope: Parchment.Scope.INLINE
})

Parchment.register(KnownWord)
Quill.register('modules/cursors', QuillCursors)

let typingTimer

export default {
  props: [
    'canEdit',
    'regionId',
    'text',
    'translation',
    'index',
    'start',
    'end',
    // this has the region where the playback head is located
    'inRegions',
    'editing'
  ],
  watch: {
    editing (newValue, oldValue) {
      if (newValue) {
        // Set up an editor for the translation field
        this.$nextTick(() => {
          this.quillTranslate = new Quill(this.$el.querySelector('#translation'), {
            theme: 'snow',
            modules: {
              toolbar: false
            }
          })
          this.quillTranslate.format('color', 'gray')
          this.quillTranslate.root.setAttribute('spellcheck', false)
          if (this.translation) {
            this.quillTranslate.insertText(0, this.translation.trim())
          }
          this.quillTranslate.on('text-change', (delta, oldDelta, source) => {
            this._regionTranslation = this.quillTranslate.getText()
            // force the text to grey
            this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
            this.saveOps()
          })
          this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
          // shift focus to the regular editor
          this.quill.focus()
        })
      } else {
        this.quillTranslate = null
      }
    }
  },
  computed: {
    isInRegion() {
      const inRegions = this.$props.inRegions
      const regionId = this.$props.regionId
      if (inRegions && regionId) {
        return this.$props.inRegions.indexOf(this.$props.regionId) > -1
      }
    },
    needsReview () {
      const doubleQuestion = this.regionText.filter(word => word.insert.indexOf('??') > -1)
      if (doubleQuestion.length) {
        return true
      }
      return false
    }
  },
  methods: {
    /**
     * Syncs up the module regionText with the editor data.
     */
    saveOps() {
        this.regionText = this.quill.getContents().ops
        this.$emit('region-text-updated', {regionId: this.regionId, text: this.regionText, translation: this._regionTranslation})
    },
    /**
     * TODO: this should maybe be a computed.
     * Turns a 1.398456847365252 float into 0:01.40 time
     */
    normalTime(value) {
      return utils.floatToMSM(value)
    },
    /**
     * Handler for when user clicks on the timestamps for this region.
     */
    playRegion() {
      this.$emit('play-region', this.regionId)
      this.$router.push({ path: `#${this.regionId}` })
    },
    /**
     * 
     */
    deleteRegion() {
      this.$emit('delete-region', this.regionId)
    },
    /**
     * 
     */
    insertDelta (delta) {
      this.quill.updateContents(delta)
    },
    /**
     * 
     */
    clearCursors () {
      this.cursors.clearCursors()
    },
    /**
     * 
     */
    setCursor (data) {
      const exists = this.cursors.cursors().filter(needle => needle.id = data.id)
      if (!exists.length) {
        this.cursors.createCursor(data.username, data.username, data.color)
      }
      this.cursors.moveCursor(data.username, data.range)
      window.cursors = this.cursors
    },
    async doneTyping () {
      this.$emit('region-done-typing', {region: this.regionId, sha: this.sha()})
      // TODO: optimize this so it doesn't search for already-known words
      const words = this.quill.getText().split(' ').filter(item => item && (item.indexOf('\n') === -1))
      console.log(words)
      Lex.wordSearch(words, (results) => {
        // 
        console.log('got reslts', results)
      })
    },
    /**
     * Returns the SHA1 of the editor contents, useful for checking for changes.
     * @returns {string}
     */
    sha () {
      return sha1(JSON.stringify(this.quill.getContents()))
    },
    /**
     * Whenever a user types, check all of the words in the editor against a list
     * of known words in the Lexicon™, careful to make sure that when words break
     * that they are discarded as 'known'.
     */
    async checkKnownWords () {
      // reset all the 'known-word' format
      this.quill.formatText(0, 9999, 'known-word', false)
      // loop through and refresh
      const knownWords = await Lex.getKnownWords()
      const text = this.quill.getText()
      const matchedWordsIndex = []
      for (let item of knownWords) {
        // check for matches
        let re = new RegExp(item.sro, 'g')
        let match = undefined
        let matches = []
        while (match = re.exec(text)) {
          // TODO: this is icky, find a better way
          // make sure we're matching whole words and not just partials
          // grab the character right after our match to
          const surroundingCharacters = [' ', '\n']
          const beforeIsSpace = surroundingCharacters.includes(text[match.index - 1])
          const afterIsSpace = surroundingCharacters.includes(text[match.index + item.sro.length])
          if (beforeIsSpace && afterIsSpace) {
            matches.push(match)
          }
        }
        for (let match of matches) {
          this.quill.formatText(match.index, item.sro.length, 'known-word', true)
          matchedWordsIndex.push([match.index, item.sro.length])
        }
      }
    }
  },
  data () {
    return {
      regionText: this.$props.text,
      hasFocus: false,
      _regionTranlation: null
    }
  },
  mounted() {
    this.quill = new Quill(this.$el.querySelector('#editor-' + this.regionId), {
      theme: 'snow',
      formats: ['known-word'],
      modules: {
        toolbar: false,
        cursors: true
      },
      readOnly: !this.canEdit
    })
    this.cursors = this.quill.getModule('cursors')
    this.quill.root.setAttribute('spellcheck', false)
    this.quill.setContents(this.regionText)
    // TODO: remove this, it's just for debugging.
    window.quill = this.quill

    // update the temporary translation value
    this._regionTranslation = this.translation

    /**
     * If a user has typed into this editor the source will be 'user
     * and we will emit an event to update all other editor instances.
     */
    this.quill.on('text-change', (delta, oldDelta, source) => {
      if (source === 'user') {
        // set an timeout for the user to stop typing
        clearTimeout(typingTimer)
        typingTimer = setTimeout(this.doneTyping, 2000)
        // check for breakages
        this.checkKnownWords()
        // send off our delta
        this.$emit('region-delta', {name: this.regionId, delta})
      }
      this.regionText = this.quill.getContents().ops
      this.saveOps()
    })

    this.quill.on('selection-change', (range, oldRange, source) => {
      if (range) {
        if (range.length === 0) {
          // console.log('User cursor is on', range.index);
          // console.log(this.quill.getFormat(range.index))
        } else {
          // console.log('User has highlighted', text);
          var text = this.quill.getText(range.index, range.length);
        }
        this.hasFocus = true
        this.$emit('region-cursor', {regionId: this.regionId, range: range})
        this.$emit('editor-focus', this.regionId)
      } else {
        // lost focus
        this.saveOps()
        // this.$emit('editor-blur')
        this.hasFocus = false
      }
    })

  }
}
</script>

<style>
#editor {
  max-height: 200px
}

.editor-rendered {
  line-height: 1.42; /* same as quill */
}

.nonEdit, .edit {
  padding: 12px 15px;
}

.review {
  background-color: #ffede6;
}

.inRegion {
  background-color:#edfcff;
}

.timestamps {
  padding-left: 8px;
  cursor: pointer;
}
.ql-container {
  font-size: 14px;
}
.ql-container.ql-snow {
  border: none;
}

.region-actions {
  text-align: right;
}

[class^='known-word-'] {
  color: blue;
}
.region-options {
  margin-left: 14px;
  color: grey;
}
.region-options-layout {
  background-color: #f5f5f5;
}
.region-index {
  position: absolute;
  top: 7px;
  right: 10px;
  font-size:20px;
  font-weight: bolder;
  color: #dedede;
}
.region-options-label {
    text-transform: uppercase;
    color: #888;
    font-size: 10px;
    margin-left: 14px;
}
.region-options-controls {
  padding: 15px 5px 5px 5px;
    text-transform: uppercase;
    font-size: 10px;
}
</style>