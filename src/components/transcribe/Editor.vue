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

Quill.register('modules/cursors', QuillCursors);

export default {
  props: [
    'regionId',
    'text',
    'start',
    'end',
    'editing',
    'inRegions'
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
      console.log('set cursor')
      console.log(data)
      const exists = this.cursors.cursors().filter(needle => needle.id = data.id)
      console.log(exists)
      if (!exists.length) {
        this.cursors.createCursor(data.username, data.username, data.color)
      }
      this.cursors.moveCursor(data.username, data.range)
      window.cursors = this.cursors
    }
  },
  data () {
    return {
      regionText: this.$props.text,
      hasFocus: false
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.quill = new Quill('#editor-' + this.regionId, {
        theme: 'snow',
        modules: {
          toolbar: false,
          cursors: true
        }
      })
      this.cursors = this.quill.getModule('cursors')
      this.quill.root.setAttribute('spellcheck', false)
      this.quill.setContents(this.regionText)
      this.quill.focus()
      this.hasFocus = true

      /**
       * If a user has typed into this editor the source will be 'user
       * and we will emit an event to update all other editor instances.
       */
      this.quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          this.$emit('region-delta', {name: this.regionId, delta})
        }
        this.regionText = this.quill.getContents().ops
        this.saveOps()
      })

      this.quill.on('selection-change', (range, oldRange, source) => {
        if (range) {
          if (range.length == 0) {
            // console.log('User cursor is on', range.index);
            this.hasFocus = true
          } else {
            var text = this.quill.getText(range.index, range.length);
            // console.log('User has highlighted', text);
          }
          this.$emit('region-cursor', {regionId: this.regionId, range: range})
        } else {
          // lost focus?
          this.saveOps()
          // this.$emit('editor-blur')
          this.hasFocus = false
        }
      })
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
/* .ql-editor {
  background-color: #f9f6d9;
} */
.region-actions {
  text-align: right;
}
</style>