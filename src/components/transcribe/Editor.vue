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
            <span class="region-options-label" v-if="!locked">Options</span>
            <div class="region-options-controls" v-if="!locked">
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
import UserService from '../../services/user'

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
let cursorTimer

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
          if (this.locked) {
            this.quillTranslate.disable()
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
        this.unlock()
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
    lock () {
      this.locked = true
      this.$emit('editor-focus', this.regionId)
      this.quill.disable()
    },
    unlock () {
      this.locked = false
      this.quill.enable()
    },
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
      console.log('setting cursor', data)
      // TODO: this is a hack, fix it
      if (data.content) {
        this.quill.setContents(data.content)
      }

      const exists = this.cursors.cursors().filter(needle => needle.id = data.id)
      if (!exists.length) {
        this.cursors.createCursor(data.user, data.user, data.color)
      }
      this.cursors.moveCursor(data.user, data.range)
      window.cursors = this.cursors
    },
    async doneTyping () {
      // check for new words
      this.$emit('region-done-typing', {region: this.regionId, sha: this.sha()})
      // TODO: optimize this so it doesn't search for already-known words
      const words = this.quill.getText().split(' ').filter(item => item && (item.indexOf('\n') === -1))
      console.log(words)
      Lex.wordSearch(words, (results) => {
        // 
        this.checkKnownWords()
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
      console.log(`known words: ${knownWords}`)
      // add a space at the beginning to allow 0-index matches
      const text = this.quill.getText()
      const matchedWordsIndex = []
      // TODO: we will need to refactor this to break the text down by word and match word-for-word
      // instead of using a regex across the board, we can't match words like `ēkot(a)` with parens
      // right now
      for (let item of knownWords) {
        // check for matches
        let re = new RegExp(item, 'g')
        let match
        let matches = []
        while (match = re.exec(text)) {
          console.log(`match: ${match}`)
          // TODO: this is icky, find a better way
          // make sure we're matching whole words and not just partials
          // grab the character right after our match to
          const surroundingCharacters = [' ', '\n', '.', ',', '(', ')']
          const beforeIsSpace = match.index === 0 || surroundingCharacters.includes(text[match.index - 1])
          const afterIsSpace = surroundingCharacters.includes(text[match.index + item.length])
          if (beforeIsSpace && afterIsSpace) {
            matches.push(match)
          }
        }
        for (let match of matches) {
          this.quill.formatText(match.index, item.length, 'known-word', true)
          matchedWordsIndex.push([match.index, item.length])
        }
      }
    },
    /**
     * Tell the lexicon service that we have known words so we can keep track of them
     * without searching a second time.
     */
    async reportKnownWordsOnLoad (deltas) {
      const known = deltas.filter(item => item.attributes && item.attributes['known-word'] !== undefined).map(item => item.insert)
      Lex.addKnownWords(known)
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
    this.locked = false
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
    this.reportKnownWordsOnLoad(this.regionText)
    // check for known words on incoming text
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
        typingTimer = setTimeout(this.doneTyping, 250)
        // check for breakages
        this.checkKnownWords()
        // send off our delta
        this.$emit('region-delta', {name: this.regionId, delta})
      }
      this.regionText = this.quill.getContents().ops
      this.saveOps()
    })

    this.quill.on('selection-change', async (range, oldRange, source) => {
      if (range) {
        // TODO: move locking outside of the regions
        // const haveLock = await UserService.lockRegion(this.regionId)
        // if (!haveLock) {
        //   console.log('Could not lock region', this.regionId)
        //   return this.lock()
        // }
        if (range.length === 0) {
          // console.log('User cursor is on', range.index);
          // console.log(this.quill.getFormat(range.index))
        } else {
          // TODO: here is where we will tag highlighted words
          // console.log('User has highlighted', text);
          // var text = this.quill.getText(range.index, range.length);
        }
        this.hasFocus = true
        // TODO: remove this hack
        const content = this.quill.getContents()
        // TODO: emit if we're editing {translation: true} or not
        // throttle the number of cursor updates
        clearTimeout(cursorTimer)
        cursorTimer = setTimeout(() => {
          this.$emit('region-cursor', {regionId: this.regionId, range: range, content: content})
        }, 75)
        // announce our focus
        this.$emit('editor-focus', this.regionId)
      } else {
        // lost focus
        this.saveOps()
        this.hasFocus = false
      }
    })

    // listen for locked regions
    UserService.listenForLock((data) => {
      console.log('region has been locked', data)
    }).catch((err) => {})
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
  padding: 10px 0;
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
  padding: 0px 5px 5px 15px;
    text-transform: uppercase;
    font-size: 10px;
}
#translation {
  margin-top: -12px;
  margin-bottom: -10px;
}
</style>