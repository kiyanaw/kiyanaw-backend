<template>
  <v-layout class="region-editor-layout" v-bind:class="{ inRegion: isInRegion, review: needsReview }">

      <v-flex xs1 v-on:click="playRegion">
        <div class="timestamps">
          <span class="time region-start">{{ normalTime(start) }}</span><br />
          <span class="time region-end">{{ normalTime(end) }}</span>
        </div>
      </v-flex>

      <v-flex xs10>
        <div v-bind:id="'region-'+regionId"
          v-on:click="regionClicked"
          v-if="!editing" class="nonEdit"
          >
          <div class="editor-rendered">
            <span v-html="html"></span><br />
          </div>
        </div>
        <div v-if="editing">
          <div id="editor"></div>
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
import utils from './utils'

let quill = null

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
    html() {
      let _html = ''
      for (let index in this.regionText) {
        const word = this.regionText[index]
        if (word.attributes && word.attributes.bold) {
          _html += `<strong>${word.insert}</strong> `
        } else {
          _html += `${word.insert} `
        }
      }
      // console.log(_html)
      // console.log(_html.indexOf('\n'))
      let bits = _html.split('\n')

      // we end up with a bunch of \n at the end for some reason
      while (['\n', ' ', ''].indexOf(bits[bits.length - 1]) !== -1) {
      // while (bits[bits.length - 1] === '\n' || bits[bits.length - 1] === ' ') {
        bits.pop()
      }
      _html = bits.join('<br />')
      return _html
    },
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
    regionClicked() {
      this.$emit('region-editor-clicked', this.$props.regionId)
    },
    saveOps() {
      this.regionText = quill.getContents().ops
      this.$emit('region-text-updated', {regionId: this.regionId, text: this.regionText})
    },
    normalTime(value) {
      return utils.floatToMSM(value)
    },
    playRegion() {
      this.$emit('play-region', this.regionId)
    },
    deleteRegion() {
      console.log('deleting region')
      this.$emit('delete-region', this.regionId)
    },
    insertDelta (delta) {
      console.log('inserting delta')
      console.log(delta)
      quill.updateContents(delta, 'api')
    }
  },
  updated () {
    if (this.editing && quill === null) {
      console.log('create new editor')
      this.$nextTick(() => {
        quill = new Quill('#editor', {
          theme: 'snow',
          modules: {
            toolbar: false
          }
        })
        quill.root.setAttribute('spellcheck', false)
        quill.setContents(this.regionText)
        quill.focus()
        // quill.setSelection(99999)
        quill.on('text-change', (delta) => {
          console.log('quill has changed')
          // fire off diff event here
          // console.log(delta)
          this.$emit('region-delta', {name: this.regionId, delta})

          this.regionText = quill.getContents().ops
          this.saveOps()
        })

        quill.on('selection-change', (range, oldRange, source) => {
          if (range) {
            if (range.length == 0) {
              // console.log('User cursor is on', range.index);
              let [leaf, offset] = quill.getLeaf(range.index)
              console.log(leaf)
              console.log(offset)
            } else {
              var text = quill.getText(range.index, range.length);
              console.log('User has highlighted', text);
            }
          } else {
            // lost focus?
            this.saveOps()
            this.$emit('editor-blur')
            quill = null
          }
        })

        window.quill = quill
      })
    }
  },
  data () {
    return {
      regionText: this.$props.text
    }
  },
  mounted() {
    // clear the rendered html
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
.ql-editor {
  background-color: #f9f6d9;
}
.region-actions {
  text-align: right;
}
</style>