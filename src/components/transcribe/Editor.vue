<template>
  <v-container v-bind:class="{ locked: locked }">
    <v-layout
      class="region-editor-layout"
      v-bind:class="{ inRegion: isInRegion, review: needsReview }"
      style="position: relative"
    >
      <span class="region-index">{{ region.index }}</span>
      <v-flex xs2 md1 v-on:click="playRegion">
        <div class="timestamps">
          <span class="time region-start">{{ normalTime(region.start) }}</span>
          <br />
          <span class="time region-end">{{ normalTime(region.end) }}</span>
        </div>
      </v-flex>

      <v-flex xs9 md10>
        <div>
          <div v-bind:id="'editor-' + region.id"></div>
        </div>
      </v-flex>

      <v-flex md1 xs1></v-flex>
    </v-layout>

    <v-layout class="region-options-layout" v-on:click="stayFocused">
      <v-flex xs2 md1>
        <v-icon class="region-lock-icon" v-if="locked">lock</v-icon>
        <div class="region-options-label" v-if="locked">{{ lockUser }}</div>
        <div class="region-options-label label-translation" v-if="editing && canEdit">English</div>
      </v-flex>

      <v-flex xs10 md10>
        <div class="region-options-edit">
          <div v-bind:id="'editor-translate-' + region.id"></div>
          <div v-if="editing & canEdit">
            <div class="region-options-controls">
              <a v-on:click="deleteRegion">Delete this region</a>
              &nbsp;
              <span
                >Version {{ region.version }} by {{ region.userLastUpdated }} --
                {{ region.id }}</span
              >
            </div>
          </div>
        </div>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import Timeout from 'smart-timeout'
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
  scope: Parchment.Scope.INLINE,
})

Parchment.register(KnownWord)
Quill.register('modules/cursors', QuillCursors)

let typingTimer
let cursorTimer

let blurFlag = false

export default {
  props: [
    'region',
    'canEdit',
    // this has the region where the playback head is located
    'inRegions',
    // true when the user is editing this region
    'editing',
  ],

  data() {
    return {
      // regionText: this.$props.text,
      // hasFocus: false,
      // _regionTranslation: null,
      locked: false,
      lockUser: '',
      // used for blur/focus timing between editors in the same region
      blurFlag: false,
      // used to ignore the first 'blur' event
      firstBlur: true,
    }
  },

  watch: {
    editing(newValue, oldValue) {
      // if (newValue) {
      // console.log(`Editing - ${this.region.id} - ${newValue}`)
      // } else {
      //   this.unlock();
      //   // this.quillTranslate = null;
      // }
    },
  },

  computed: {
    isInRegion() {
      const inRegions = this.$props.inRegions
      const regionId = this.$props.region.id
      if (inRegions && regionId) {
        return this.inRegions.indexOf(this.region.id) > -1
      }
    },
    // TODO this needs tests
    needsReview() {
      const doubleQuestion = this.region.text.filter((word) => word.insert.indexOf('??') > -1)
      if (doubleQuestion.length) {
        return true
      }
      return false
    },
  },
  methods: {
    getMainOps() {
      return this.quill.getContents().ops
    },
    lock(lockUser = 'unknown') {
      console.log('This region is locked', this.region.id)
      this.locked = true
      this.$emit('editor-blur', this.region.id, { silent: true })
      this.lockUser = lockUser
      this.quill.disable()
      this.quillTranslate.disable()
    },
    unlock() {
      console.log('This region is unlocked', this.region.id)
      this.locked = false
      this.lockUser = ''
      this.quill.enable()
      this.quillTranslate.enable()
      this.cursors.clearCursors()
      this.cursorsTranslate.clearCursors()
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
      this.$emit('play-region', this.region.id)
      if (`#${this.region.id}` !== this.$router.history.current.hash) {
        this.$router.push({ path: `#${this.region.id}` })
      }
      // keep the editor from losing focus
      this.maybeFocusBlur({ type: 'focus' })
    },

    stayFocused() {
      this.maybeFocusBlur({ type: 'focus' })
    },

    /**
     *
     */
    deleteRegion() {
      this.$emit('delete-region', this.region)
    },
    /**
     *
     */
    insertDelta(delta) {
      this.quill.updateContents(delta)
    },
    /**
     *
     */
    clearCursors() {
      this.cursors.clearCursors()
    },

    /**
     * If we are receiving cursor updates they are in another region.
     */
    setCursor(data) {
      // console.log('setting cursor', data)
      if (data.source === 'secondary') {
        this.quillTranslate.setText(data.text || '', 'api')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
        // set the cursor
        const exists = this.cursorsTranslate.cursors().filter((needle) => (needle.id = data.id))
        if (exists.length) {
          this.cursorsTranslate.createCursor(data.user, data.user, data.color)
        }
        this.cursorsTranslate.moveCursor(data.user, data.range)
        this.cursors.removeCursor(data.user)
        this.cursors.clearCursors()
      } else {
        this.quill.setContents(data.text, 'silent')
        // set the cursor
        const exists = this.cursors.cursors().filter((needle) => (needle.id = data.id))
        if (!exists.length) {
          this.cursors.createCursor(data.user, data.user, data.color)
        }
        this.cursors.moveCursor(data.user, data.range)
        this.cursorsTranslate.clearCursors()
        this.cursorsTranslate.removeCursor(data.user)
      }
      window.cursors = this.cursors
    },

    /**
     * Whenever a user types, check all of the words in the editor against a list
     * of known words in the Lexicon™, careful to make sure that when words break
     * that they are discarded as 'known'.
     */
    async invalidateKnownWords() {
      // reset all the 'known-word' format
      this.quill.formatText(0, 9999, 'known-word', false)
      // loop through and refresh
      const knownWords = await Lex.getKnownWords()
      // console.log(`known words: ${knownWords}`)
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
        while ((match = re.exec(text))) {
          // console.log(`match: ${match}`)
          // TODO: this is icky, find a better way
          // make sure we're matching whole words and not just partials
          // grab the character right after our match to
          const surroundingCharacters = [' ', '\n', '.', ',', '(', ')']
          const beforeIsSpace =
            match.index === 0 || surroundingCharacters.includes(text[match.index - 1])
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
    async reportKnownWords(deltas) {
      const known = deltas
        .filter((item) => item.attributes && item.attributes['known-word'] !== undefined)
        .map((item) => item.insert)
      Lex.addKnownWords(known)
    },

    /**
     * Returns a list of the quill text cleansed of newline characters.
     */
    getTokenizedText() {
      return this.quill
        .getText()
        .replace(/(\r\n|\n|\r)/gm, '')
        .split(' ')
        .filter((item) => item && item.indexOf('\n') === -1)
    },

    /**
     * Syncs up the module regionText with the editor data.
     */
    notifyRegionChanged(editor) {
      if (!this.locked) {
        const ops = this.quill.getContents().ops
        console.log(this.quill)
        console.log('ops', ops)
        this.region.text = ops
        this.region.translation = this.quillTranslate.getText()
        setTimeout(() => {
          this.$emit('region-text-updated', {
            id: this.region.id,
            editor: editor,
            text: ops,
          })
        }, 50)
      }
    },

    /**
     * @description Handles changes to the main editor.
     */
    async onEditorTextChange(delta, oldDelta, source) {
      if (source === 'user') {
        // check for breakages
        // notify this editor changed
        this.notifyRegionChanged('main')
        this.invalidateKnownWords()
      }
    },

    async onTranslationTextChange(delta, oldDelta, source) {
      if (source === 'user') {
        this.notifyRegionChanged('secondary')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
      }
    },

    async onCursorChange(range, source, text) {
      this.$emit('region-cursor', {
        id: this.region.id,
        range,
        source,
        text,
      })
    },

    async onEditorSelectionChange(range, oldRange, source) {
      if (!this.locked) {
        if (range) {
          if (range.length === 0) {
            // console.log('User cursor is on', range.index)
          } else {
            // console.log('User has highlighted', text)
          }
          // throttle the number of cursor updates
          Timeout.clear(`cursor-change-timeout-main-${this.region.id}`)
          Timeout.set(
            `cursor-change-timeout-main-${this.region.id}`,
            this.onCursorChange,
            100,
            range,
            'main',
            this.region.text,
          )
          // we must delay the focus event to give the other editor's blur
          // event a chance to fire first
          this.$nextTick(() => {
            this.maybeFocusBlur({
              type: 'focus',
              source: 'main',
            })
          })
        } else {
          this.maybeFocusBlur({
            type: 'blur',
            source: 'main',
          })
        }
      }
    },

    /**
     * Binds the editor events to the component.
     */
    async bindEditorEvents() {
      if (this.canEdit) {
        this.quill.on('text-change', this.onEditorTextChange)
        this.quill.on('selection-change', this.onEditorSelectionChange)
        this.quillTranslate.on('text-change', this.onTranslationTextChange)

        // TODO: move this somewhere we can test it
        this.quillTranslate.on('selection-change', (range, oldRange, source) => {
          if (!this.locked) {
            if (range) {
              Timeout.clear(`cursor-change-timeout-secondary-${this.region.id}`)
              Timeout.set(
                `cursor-change-timeout-secondary-${this.region.id}`,
                this.onCursorChange,
                100,
                range,
                'secondary',
                this.region.translation,
              )

              // we must delay the focus event to give the other editor's blur
              // event a chance to fire first
              this.$nextTick(() => {
                this.maybeFocusBlur({
                  type: 'focus',
                  source: 'secondary',
                })
              })
            } else {
              this.maybeFocusBlur({
                type: 'blur',
                source: 'secondary',
              })
            }
          }
        })
      }
    },

    /**
     * If we jump from main -> secondary editor, we don't want to fire the 'blur'
     * event because we're not done yet. Only fire the event if we get a 'blur'
     * event without an immediate 'focus' event.
     *
     * TODO: test this
     */
    maybeFocusBlur(event) {
      // can't do anything if we're locked
      // console.log(`!! mayFocusBlur ${this.region.id} (${this.locked})`, event);
      if (this.locked || !this.canEdit) {
        return
      }
      if (event.type === 'blur') {
        // When the editors load they fire off a blur we can't silence.
        if (this.firstBlur) {
          this.firstBlur = false
          return
        }
        // console.log('blur called')
        this.blurFlag = true
        Timeout.set(
          `blur-timeout-${this.region.id}`,
          () => {
            if (this.blurFlag) {
              console.log(' --> blur fired')
              this.$emit('editor-blur', this.region.id)
              this.blurFlag = false
            }
          },
          25,
          this.region.id,
        )
      } else {
        if (this.blurFlag) {
          // we're within the timeout, do not fire the blur event
          this.blurFlag = false
        } else {
          // we're clear, fire the event
          if (!this.editing) {
            // console.log(' --> focus fired')
            this.$emit('editor-focus', this.region.id)
          }
        }
      }
    },

    mountMainEditor() {
      this.quill = new Quill(this.$el.querySelector('#editor-' + this.region.id), {
        theme: 'snow',
        formats: ['known-word'],
        modules: {
          toolbar: false,
          cursors: true,
        },
        readOnly: !this.canEdit,
      })
      this.cursors = this.quill.getModule('cursors')
      this.quill.root.setAttribute('spellcheck', false)
      this.quill.setContents(this.region.text, 'silent')
      // this.quill.blur();
    },

    mountSecondEditor() {
      // TODO: this needs to clear cursors, etc
      this.quillTranslate = new Quill(
        this.$el.querySelector('#editor-translate-' + this.region.id),
        {
          theme: 'snow',
          modules: {
            toolbar: false,
            cursors: true,
          },
          readOnly: !this.canEdit,
        },
      )

      this.quillTranslate.format('color', 'gray')
      this.quillTranslate.root.setAttribute('spellcheck', false)
      if (this.region.translation) {
        this.quillTranslate.insertText(0, this.region.translation.trim(), 'silent')
      }
      this.cursorsTranslate = this.quillTranslate.getModule('cursors')
      this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
      // this.quillTranslate.blur();
    },

    async realtimeUpdate(region) {
      if (this.editing) {
        // only update start/end times when editing
      } else {
        console.log('updating with new region')
        // deal with times
        this.region.start = region.start
        this.region.end = region.end
        // update text
        this.region.text = region.text
        this.quill.setContents(region.text, 'silent')
        // update translation
        this.translation = region.translation
        this.quillTranslate.setText(region.translation || '', 'silent')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
        // update verision
        this.region.version = region.version
        this.region.userLastUpdated = region.userLastUpdated
        this.dateLastUpdated = region.dateLastUpdated
      }
    },
  },

  mounted() {
    this.locked = false

    this.mountMainEditor()
    this.mountSecondEditor()

    this.reportKnownWords(this.region.text)

    // this.quillTranslate.setText(this.region.translation, 'silent')
    this.bindEditorEvents()

    // TODO: remove this, it's just for debugging.
    window.quill = this.quill
    window.cursors = this.cursors
    window.quillTranslate = this.quillTranslate
    window.cursorsTranslate = this.cursorsTranslate

    // update the temporary translation value
    // this._regionTranslation = this.region.translation
  },
}
</script>

<style>
#editor {
  max-height: 200px;
}

.editor-rendered {
  line-height: 1.42; /* same as quill */
}

.nonEdit,
Yu .edit {
  padding: 12px 15px;
}

.review {
  background-color: #ffede6;
}

.inRegion {
  background-color: #edfcff;
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
  font-size: 20px;
  font-weight: bolder;
  color: #b6b6b6;
}
.region-options-label {
  text-transform: uppercase;
  color: #888;
  font-size: 10px;
  margin-left: 8px;
}

.label-translation {
  margin: 23px 0px 24px 8px;
}

.label-options {
  position: relative;
  bottom: 1px;
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
.ql-editor {
  padding: 5px 15px !important;
}

.locked {
  opacity: 0.4;
}
.region-lock-icon {
  margin: 10px;
}
</style>
