<template>
  <v-container class="the-container">

    <v-layout row>
      <v-flex xs12 class="audio-player">
        <audio-player ref="player"
          v-if="source"
          v-bind:audioFile="source"
          v-bind:peaks="peaks"
          v-bind:regions="regions"
          v-bind:canEdit="user !== null"
          v-bind:inboundRegion="inboundRegion"
          v-on:region-updated="onUpdateRegion"
          v-on:region-in="highlightRegion"
          v-on:region-out="blurRegion">
        </audio-player>
      </v-flex>
    </v-layout>

    <v-layout row>
      <v-flex md1></v-flex>
      <v-flex xs12 md10>
        <h3 class="title">{{ title }}</h3>
      </v-flex>
      <v-flex md1></v-flex>
    </v-layout>

    <v-layout row >
      <v-flex hidden-sm-and-down></v-flex>
      <v-flex xs12 md10 elevation-1 tEditor scroll-container>
        <v-container
          id="scroll-target">
          <div v-for="region in sortedRegions"
            v-bind:id="region.id"
            v-bind:key="region.id">
            <editor
              v-if="regions"
              v-bind:canEdit="user !== null"
              v-bind:ref="region.id"
              v-bind:regionId="region.id"
              v-bind:text="region.text"
              v-bind:index="region.index"
              v-bind:translation="region.translation"
              v-bind:start="region.start"
              v-bind:end="region.end"
              v-bind:inRegions="inRegions"
              v-bind:editing="editingRegion === region.id"
              v-on:editor-focus="onRegionFocus"
              v-on:editor-blur="onEditorBlur"
              v-on:play-region="playRegion"
              v-on:region-text-updated="regionTextUpdated"
              v-on:region-delta="regionDelta"
              v-on:region-cursor="regionCursor"
              v-on:delete-region="deleteRegion"
              v-on:region-done-typing="regionDoneTyping"
              >
            </editor>
            <hr />
          </div>
        </v-container>
      </v-flex>
      <v-flex hidden-sm-and-down></v-flex>
    </v-layout>
    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10>
        <v-btn small color="primary" dark
          v-if="user!==null"
          v-on:click="saveData">save</v-btn>
        <span v-if="saved">saved!</span>
      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>
  </v-container>

</template> 

<script>

import AudioPlayer from './AudioPlayer.vue'
import Editor from './Editor.vue'
import TranscriptionService from '../../services/transcriptions'
import EnvService from '../../services/env'
import UserService from '../../services/user'
import { setTimeout } from 'timers';
import uuid from 'uuid/v1'
import {ulid} from 'ulid'
import { randomFillSync } from 'crypto';

function getColor(){ 
  return "hsl(" + 360 * Math.random() + ',' +
             (25 + 70 * Math.random()) + '%,' + 
             (55 + 10 * Math.random()) + '%)'
}

// this is the local user's cursor color
const cursorColor = `${getColor()}`
// keep track of this cursor
let myCursor
let inboundRegion = null

export default {

  components: {
    AudioPlayer,
    Editor
  },

  computed: {
    /**
     * @description Returns a list of regions in order of the start time.
     * @returns {Array<object>} List of regions in order of start time.
     */
    sortedRegions() {
      if (this.regions) {
        // use .slice() to copy the array and prevent modifying the original
        const sorted = this.regions.slice().sort((a, b) => (a.start > b.start) ? 1 : -1)
        // add an index for visual aide
        for (const index in sorted) {
          sorted[index].index = index
        }
        return sorted
      } else {
        return []
      }
    }
  },
 
  data () {
    return {
      /**
       * @type {String}
       * @description ID of the transcription.
       */
      transcriptionId: null,
      source: null,
      peaks: null,
      regions: null,
      /**
       * @type {String|null}
       * @default null
       * @description Name of the region currently being edited, `null` otherwise.
       */
      editingRegion: null,
      inboundRegion: null,
      inRegions: [],
      title: '',
      authorId: null,
      saved: false,
      members: [],
      user: null,
      height: 0
    }
  },

  methods: {
    /**
     * @description After render, adjust the height of the editor.
     */
    fixScrollHeight() {
      /* This is a mess. Someone please help. */
      try {
        const scrollBox = document.querySelector('.scroll-container')
        const scrollBoxTop = scrollBox.getBoundingClientRect().y
        const randomFixNumber = 24 // don't ask - I'm just horrible at CSS
        let newHeight
        if (this.user) {
          newHeight = `${window.innerHeight - scrollBoxTop - randomFixNumber - 50}px`
        } else {
          newHeight = `${window.innerHeight - scrollBoxTop - randomFixNumber}px`
        }
        scrollBox.style.height = newHeight
      } catch (e) {
        // pass
      }
    },


    /** */
    onEditorBlur () {
      this.editingRegion = null
    },


    /**
     * @description Triggered when a region editor is activated. Notifies all regions with the
     * current regionId being edited.
     * @param {String} regionId Name of the current region being edited.
     */
    onRegionFocus (regionId) {
      // setting the editingRegion activates that region's editor
      this.editingRegion = regionId
      for (let index in this.regions) {
        this.regions[index].activeRegion = regionId
      }
    },


    /** */
    regionTextUpdated (update) {
      const targetRegion = this.regions.filter(r => r.id === update.regionId)
      if (targetRegion.length) {
        targetRegion[0].text = update.text
        targetRegion[0].translation = update.translation
      }
    },
    regionDelta (data) {},
    regionCursor (data) {
      data.color = cursorColor
      const update = {
        cursor: data,
        user: `${this.user.name}`
      }
      UserService.sendCursor(update).catch((e) => {})
    },
    regionDoneTyping(data) {
      // 
      this.saveData()
    },
    coverage () {
      let val = 0
      if (this.$refs.player && this.regions) {
        const regionCoverage = this.regions.map(x => (x.end - x.start)).reduce((x, y) => x + y)
        const totalLength = this.$refs.player.maxTime
        val = regionCoverage / totalLength
      }
      return (val * 100).toFixed(1)
    },
    async saveData () {
      let regions = this.regions
      for (let index in regions) {
        const regionId = regions[index].id
        const regionText = this.$refs[regionId][0].text
        const regionTranslation = this.$refs[regionId][0].translation
        regions[index].text = regionText
        regions[index].translation = regionTranslation
      }

      const result = await TranscriptionService.saveTranscription(this.authorId, {
        title: this.title,
        source: this.source,
        type: 'audio',
        regions: this.sortedRegions,
        length: this.$refs.player.maxTime,
        coverage: this.coverage(),
        dateLastUpdated: +new Date(),
        lastUpdateBy: this.username
      })
      if (result) {
        this.saved = true
        setTimeout(() => {
          this.saved = false
        }, 3000)
      }
    },
    highlightRegion (region) {
      this.inRegions = [region.id]
      this.$nextTick(() => {
        document.getElementById(region.id).scrollIntoView()
      })
    },

    /**
     * @description Loads initial data based on URL params.
     */
    async load () {
      const data = await TranscriptionService.getTranscription(this.transcriptionId)
      this.source = data.source
      this.peaks = data.peaks || null
      this.regions = data.regions || []
      this.title = data.title
      this.authorId = data.authorId
      this.inboundRegion = this.$route.hash.replace('#', '') || null
      this.fixScrollHeight()
    },

    blurRegion (region) {
      this.inRegions = this.inRegions.filter(r => r !== region.id)
    },

    playRegion(regionId) {
      this.$refs.player.playRegion(regionId)
    },

    deleteRegion (regionId) {
      this.regions = this.regions.filter(r => r.id !== regionId)
    },

    /**
     * @description Handle region changes. If the `region` provided already
     * exists, update it with the new details, otherwise, create the region.
     * @param {object} region The new region details to update with.
     * @param {string} region.id The id of the region being updated.
     * @param {number} region.start The timestamp of the region start point.
     * @param {number} region.end The timestamp of the region end point.
     */
    onUpdateRegion (region) {
      const regionIds = this.regions.map(item => item.id)
      if (regionIds.indexOf(region.id) === -1) {
        const regionData = {
          start: region.start,
          end: region.end,
          id: region.id,
          text: []
        }
        this.regions.push(regionData)
      } else {
        const targetRegion = this.regions.filter(needle => needle.id === region.id)
        if (targetRegion.length) {
          targetRegion[0].start = region.start
          targetRegion[0].end = region.end
        }
      }
    }
  },
  /**
   * Mount point for this component.
   */
  async mounted() {
    try {
      this.user = await UserService.getUser()
    } catch (error) {
      console.warn(error)
      this.user = null
    }

    /**
     * Pull some parameters out of our URL to determine the doc to load.
     */
    this.transcriptionId = this.$route.params.id
    const docId = this.transcriptionId.split(':')[1]

    /**
     * Set up a subscription for new cursor changes.
     */
    // UserService.listenForCursor((data) => {
    //   if (data.user !== this.user.name) {
    //     // only try to set cursors for local regions
    //     if (this.$refs[data.cursor.regionId]) {
    //       this.$refs[data.cursor.regionId][0].setCursor({user: data.user, ...data.cursor})
    //     }
    //   }
    // }).catch((e) => {})

    /**
     * Get a list of the current locked regions.
     */
    // TODO: managing locked regions should probably happen outside of the regions

    /**
     * Listen for <space> event (and others) to interact with the waveform.
     */
    document.addEventListener('keyup', (evt) => {
      // TODO: this might work better in Editor, blur the cursor at the same time
      if (evt.keyCode === 27) {
        this.editingRegion = null
      }
      if (!this.editingRegion) {
        // play/pause on space bar
        if (evt.keyCode === 32) {
          try {
            let canPlay = true
            for (let region of this.regions) {
              if (this.$refs[region.id][0].hasFocus) {
                canPlay = false
              }
            }
            if (canPlay) {
              this.$refs.player.playPause()
            }

          } catch (e) {
            console.error(e)
          }
        }
      }
    })
    this.fixScrollHeight()
    // load up
    this.load()
  }
}
</script>

<style>
.scroll-container {
  height:500px;
  overflow: auto;
}
.time {
  font-family: monospace;
  font-size: x-small;
}
.audio-player {
  height: 250px;
}
.title {
  margin: 0 0 20px 0;
}
</style>