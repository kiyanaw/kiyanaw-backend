<template>
  <v-layout class="region-editor-layout" v-bind:class="{ inRegion: isInRegion, review: needsReview }">

      <v-flex xs1 v-on:click="playRegion">
        <div class="timestamps">
          <span class="time region-start">{{ normalTime(start) }}</span><br />
          <span class="time region-end">{{ normalTime(end) }}</span>
        </div>
      </v-flex>

      <v-flex xs10>
        <div>
          <div v-bind:id="'editor-' + regionId"></div>
        </div>
      </v-flex>

      <v-flex xs1 class="region-actions">
        <v-btn flat icon v-on:click="deleteRegion">
          <v-icon>clear</v-icon>
        </v-btn>
      </v-flex>

  </v-layout>
</template>

<script>

import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import utils from './utils'

const Parchment = Quill.import('parchment')
let KnownWord = new Parchment.Attributor.Class('known-word', 'known-word', {
  scope: Parchment.Scope.INLINE
})
Parchment.register(KnownWord)
Quill.register('modules/cursors', QuillCursors)

let knownWords = {}
let typingTimer

export default {
  props: [
    'regionId',
    'text',
    'start',
    'end',
    'inRegions' // TODO: is this still used?
  ],
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
    saveOps() {
        this.regionText = this.quill.getContents().ops
        this.$emit('region-text-updated', {regionId: this.regionId, text: this.regionText})
    },
    normalTime(value) {
      return utils.floatToMSM(value)
    },
    playRegion() {
      this.$emit('play-region', this.regionId)
    },
    deleteRegion() {
      this.this.$emit('delete-region', this.regionId)
    },
    insertDelta (delta) {
      this.quill.updateContents(delta, 'api')
    },
    clearCursors () {
      this.cursors.clearCursors()
    },
    setCursor (data) {
      const exists = this.cursors.cursors().filter(needle => needle.id = data.id)
      if (!exists.length) {
        this.cursors.createCursor(data.username, data.username, data.color)
      }
      this.cursors.moveCursor(data.username, data.range)
      window.cursors = this.cursors
    },
    checkKnownWords () {
      console.log('checking known words')
    }
  },
  data () {
    return {
      regionText: this.$props.text,
      hasFocus: false
    }
  },
  mounted() {
    // this.$nextTick(() => {
      this.quill = new Quill(this.$el.querySelector('#editor-' + this.regionId), {
        theme: 'snow',
        formats: ['known-word'],
        modules: {
          toolbar: false,
          // cursors: true
        }
      })
      this.cursors = this.quill.getModule('cursors')
      this.quill.root.setAttribute('spellcheck', false)
      this.quill.setContents(this.regionText)
      this.quill.focus()
      this.hasFocus = true
      window.quill = this.quill

      /**
       * If a user has typed into this editor the source will be 'user
       * and we will emit an event to update all other editor instances.
       */
      this.quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          // set an timeout for the user to stop typing
          console.log('set timer')
          clearTimeout(typingTimer)
          typingTimer = setTimeout(this.checkKnownWords, 1000)
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
        } else {
          // lost focus
          this.saveOps()
          // this.$emit('editor-blur')
          this.hasFocus = false
        }
      })
    // })
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

.inRegion {
  background-color:#edfcff;
}

.review {
  background-color: #ffede6;
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
</style>