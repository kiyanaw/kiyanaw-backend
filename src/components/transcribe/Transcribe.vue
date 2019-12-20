<template>
  <v-container class="the-container">
    <v-layout row>
      <v-flex xs12 class="audio-player">
        <audio-player
          ref="player"
          v-if="source"
          v-bind:audioFile="source"
          v-bind:peaks="peaks"
          v-bind:regions="regions"
          v-bind:canEdit="user !== null"
          v-bind:inboundRegion="inboundRegion"
          v-on:region-updated="onUpdateRegion"
          v-on:region-in="highlightRegion"
          v-on:region-out="onBlurRegion"
        >
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

    <v-layout row>
      <v-flex hidden-sm-and-down></v-flex>
      <v-flex xs12 md10 elevation-1 tEditor scroll-container>
        <v-container id="scroll-target">
          <div v-for="region in sortedRegions" v-bind:id="region.id" v-bind:key="region.id">
            <editor
              v-if="regions"
              v-bind:region="region"
              v-bind:canEdit="user !== null"
              v-bind:ref="region.id"
              v-bind:inRegions="inRegions"
              v-bind:editing="editingRegion === region.id"
              v-on:editor-focus="onRegionFocus"
              v-on:editor-blur="onEditorBlur"
              v-on:play-region="playRegion"
              v-on:region-text-updated="onRegionTextUpdated"
              v-on:region-cursor="regionCursor"
              v-on:delete-region="onDeleteRegion"
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
        <v-btn small color="primary" dark v-if="user !== null" v-on:click="saveData">save</v-btn>
        <span v-if="saved">saved!</span>
      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import Timeout from 'smart-timeout'

import AudioPlayer from './AudioPlayer.vue'
import Editor from './Editor.vue'
import TranscriptionService from '../../services/transcriptions'
import EnvService from '../../services/env'
import UserService from '../../services/user'
import Lex from '../../services/lexicon'

import { setTimeout } from 'timers'

function getColor() {
  return (
    'hsl(' +
    360 * Math.random() +
    ',' +
    (25 + 70 * Math.random()) +
    '%,' +
    (55 + 10 * Math.random()) +
    '%)'
  )
}

// this is the local user's cursor color
const cursorColor = `${getColor()}`
// keep track of this cursor
let myCursor
let inboundRegion = null

// used to throttle updates
let regionUpdateTimer
// only send updates after a pause
const SEARCH_INTERVAL = 1500
const SAVE_INTERVAL = 5000

export default {
  components: {
    AudioPlayer,
    Editor,
  },

  computed: {
    /**
     * @description Returns a list of regions in order of the start time.
     * @returns {Array<object>} List of regions in order of start time.
     */
    sortedRegions() {
      if (this.regions) {
        // use .slice() to copy the array and prevent modifying the original
        const sorted = this.regions.slice().sort((a, b) => (a.start > b.start ? 1 : -1))
        // add an index for visual aide
        for (const index in sorted) {
          sorted[index].index = index
        }
        return sorted
      } else {
        return []
      }
    },

    regionIds() {
      return this.regions.map((region) => region.id)
    },
  },

  data() {
    return {
      /**
       * @type {String}
       * @description ID of the transcription.
       */
      // authorId: null,
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
      // authorId: null,
      saved: false,
      members: [],
      user: null,
      height: 0,
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
    onEditorBlur(regionId, { silent = false } = {}) {
      // only clear the editing region if we focus away from any editor
      if (regionId === this.editingRegion) {
        this.editingRegion = null
      }
      // only unlock the region if we're the editor that has the lock
      if (!silent) {
        console.log(' !!!! Unlocking region from blur', regionId)
        UserService.unlockRegion(this.transcriptionId, regionId)
          .then(() => {
            // console.log('region unlocked', regionId)
          })
          .catch((error) => {
            console.log('could not unlock region', error)
          })
      }
    },

    /**
     * @description Triggered when a region editor is activated. Notifies all regions with the
     * current regionId being edited.
     * @param {String} regionId Name of the current region being edited.
     */
    onRegionFocus(regionId) {
      // setting the editingRegion activates that region's editor
      this.editingRegion = regionId
      for (let index in this.regions) {
        this.regions[index].activeRegion = regionId
      }
      UserService.lockRegion(this.transcriptionId, regionId).then((haveLock) => {
        // console.log('We have lock:', haveLock)
        if (!haveLock) {
          if (this.$refs[regionId] && this.$refs[regionId][0]) {
            // Someone else has the lock on this region
            this.$refs[regionId][0].lock()
          }
        }
      })
    },

    /** */
    onRegionTextUpdated(event) {
      const targetRegion = this.regions.filter((r) => r.id === event.id)[0]
      // YOU ARE HERE - BINDINGS ARE NOT UPDATING ON REGION.TEXT
      console.log('target region: ', targetRegion)
      // search for new words
      if (event.editor === 'main') {
        const words = this.$refs[targetRegion.id][0].getTokenizedText()
        Timeout.clear('word-search-timer')
        Timeout.set('word-search-timer', this.searchForNewWords, SEARCH_INTERVAL, words)
      }
      // set a timer to save this region
      Timeout.clear(`save-region-${event.id}-timer`)
      Timeout.set(`save-region-${event.id}-timer`, this.saveRegion, SAVE_INTERVAL, targetRegion)
    },

    async searchForNewWords(words) {
      await Lex.wordSearch(words)
      for (let region of this.regions) {
        // trigger update for all editors
        this.$refs[region.id][0].invalidateKnownWords()
      }
    },

    async saveRegion(region, text) {
      console.log('saving region', region)
      TranscriptionService.updateRegion(this.transcriptionId, region)
    },

    // readyUpdate (args) {
    //   console.log('ready update called', args)
    // },

    /** */
    regionCursor(data) {
      data.color = cursorColor
      const update = {
        cursor: data,
        user: `${this.user.name}`,
      }
      UserService.sendCursor(update).catch((e) => {
        console.log(e)
      })
    },

    /** */
    coverage() {
      let val = 0
      if (this.$refs.player && this.regions) {
        const regionCoverage = this.regions.map((x) => x.end - x.start).reduce((x, y) => x + y)
        const totalLength = this.$refs.player.maxTime
        val = regionCoverage / totalLength
      }
      return (val * 100).toFixed(1)
    },

    /** don't use this for regions */
    async saveData() {
      let regions = this.regions
      for (let index in regions) {
        const regionId = regions[index].id
        const regionText = this.$refs[regionId][0].text
        const regionTranslation = this.$refs[regionId][0].translation
        regions[index].text = regionText
        regions[index].translation = regionTranslation
      }
      let result
      // const result = await TranscriptionService.saveTranscription(this.authorId, {
      //   title: this.title,
      //   source: this.source,
      //   type: 'audio',
      //   regions: this.sortedRegions,
      //   length: this.$refs.player.maxTime,
      //   coverage: this.coverage(),
      //   dateLastUpdated: +new Date(),
      //   lastUpdateBy: this.user.name
      // })
      if (result) {
        this.saved = true
        setTimeout(() => {
          this.saved = false
        }, 3000)
      }
    },

    /** */
    highlightRegion(region) {
      this.inRegions = [region.id]
      this.$nextTick(() => {
        document.getElementById(region.id).scrollIntoView()
      })
    },

    /**
     * @description Loads initial data based on URL params.
     */
    async load() {
      // TODO: move this to updateDataFromTranscription() for realtime updates
      const data = await TranscriptionService.getTranscription(this.transcriptionId)
      this.source = data.source
      this.peaks = data.peaks || null
      this.title = data.title
      // TODO: move regions to an ADT
      this.regions = data.regions || []
      // this.authorId = data.authorId
      this.inboundRegion = this.$route.hash.replace('#', '') || null
      this.fixScrollHeight()
      this.checkForLockedRegions()
    },

    /**
     * @description Triggered when a region is no longer being edited
     */
    onBlurRegion(region) {
      this.inRegions = this.inRegions.filter((r) => r !== region.id)
      // TODO: unlock region
    },

    /** */
    playRegion(regionId) {
      this.$refs.player.playRegion(regionId)
    },

    /** */
    onDeleteRegion(region) {
      this.removeLocalRegion(region)
      TranscriptionService.deleteRegion(this.transcriptionId, region)
    },

    removeLocalRegion(region) {
      this.regions = this.regions.filter((r) => r.id !== region.id)
    },

    /**
     * @description Handle region changes. If the `region` provided already
     * exists, update it with the new details, otherwise, create the region.
     * @param {object} region The new region details to update with.
     * @param {string} region.id The id of the region being updated.
     * @param {number} region.start The timestamp of the region start point.
     * @param {number} region.end The timestamp of the region end point.
     */
    onUpdateRegion(regionUpdate) {
      const regionIds = this.regions.map((item) => item.id)
      if (regionIds.indexOf(regionUpdate.id) === -1) {
        const regionData = {
          start: regionUpdate.start,
          end: regionUpdate.end,
          id: regionUpdate.id,
          text: [],
        }
        this.regions.push(regionData)
        window.data = regionData
        // save the new region
        TranscriptionService.createRegion(this.transcriptionId, regionData).catch(function(error) {
          console.error('Failed to create region', error)
        })
      } else {
        let targetRegion = this.regions.filter((needle) => needle.id === regionUpdate.id)
        if (targetRegion.length) {
          // update bound data
          targetRegion = targetRegion[0]
          targetRegion.start = regionUpdate.start
          targetRegion.end = regionUpdate.end
          TranscriptionService.updateRegion(this.transcriptionId, targetRegion).catch(function(
            error,
          ) {
            console.error('Failed to update region', error)
          })
        }
      }
    },

    async checkForLockedRegions() {
      UserService.getRegionLocks(this.transcriptionId)
        .then((locks) => {
          // we only care about locks that aren't ours
          locks = locks.filter((item) => item.user !== this.user.name)
          for (const lock of locks) {
            console.log('Incoming lock for region', lock.id)
            if (this.$refs[lock.id]) {
              this.$refs[lock.id][0].lock(lock.user)
            }
          }
        })
        .catch((error) => {
          console.error(error)
        })
    },

    async listenForRegions() {
      TranscriptionService.listenForRegions((actionType, region) => {
        if (actionType === 'created') {
          console.log('Creating region!', region, this.regionIds)
          if (!this.regionIds.includes(region.id)) {
            this.regions.push(region)
          }
        }
        if (actionType === 'updated') {
          if (this.regionIds.includes(region.id)) {
            // update the editor (unobtrusively)
            if (this.$refs[region.id] && this.$refs[region.id][0]) {
              this.$refs[region.id][0].realtimeUpdate(region)
              // update times for the player
              const targetRegion = this.regions.filter((r) => r.id === region.id)[0]
              targetRegion.start = region.start
              targetRegion.end = region.end
              this.$refs.player.renderRegions()
            }
          }
        }
        if (actionType === 'deleted') {
          this.removeLocalRegion(region)
        }
      })
    },

    async listenForLockedRegions() {
      // listen for locked regions
      UserService.listenForLock((data) => {
        if (this.$refs[data.id] && this.$refs[data.id][0]) {
          console.log(' ** region lock listener', data)
          if (data.action === 'created') {
            // console.log(' --> create')
            this.$refs[data.id][0].lock(data.user)
          } else if (data.action === 'deleted') {
            // console.log(' --> delete')
            this.$refs[data.id][0].unlock()
          }
        }
      }).catch((err) => {})
    },
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
    // this.authorId = this.$route.params.id
    this.transcriptionId = this.$route.params.id

    this.listenForRegions()
    this.listenForLockedRegions()

    /**
     * Set up a subscription for new cursor changes.
     */
    UserService.listenForCursor((data) => {
      if (data.user !== this.user.name) {
        // only try to set cursors for local regions
        if (this.$refs[data.cursor.id] && this.$refs[data.cursor.id][0]) {
          this.$refs[data.cursor.id][0].setCursor({ user: data.user, ...data.cursor })
        }
      }
    }).catch((e) => {
      console.warn('Cursor listen error', e)
    })

    /**
     * Get a list of the current locked regions.
     */
    // TODO: managing locked regions should probably happen outside of the regions

    /**
     * Listen for <space> event (and others) to interact with the waveform.
     */
    // document.addEventListener('keyup', (evt) => {
    //   // TODO: this might work better in Editor, blur the cursor at the same time
    //   if (evt.keyCode === 27) {
    //     this.editingRegion = null
    //   }
    //   if (!this.editingRegion) {
    //     // play/pause on space bar
    //     if (evt.keyCode === 32) {
    //       try {
    //         let canPlay = true
    //         for (let region of this.regions) {
    //           if (this.$refs[region.id][0].hasFocus) {
    //             canPlay = false
    //           }
    //         }
    //         if (canPlay) {
    //           this.$refs.player.playPause()
    //         }

    //       } catch (e) {
    //         console.error(e)
    //       }
    //     }
    //   }
    // })
    this.fixScrollHeight()
    // load up
    this.load()
  },
}
</script>

<style>
.scroll-container {
  height: 500px;
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
