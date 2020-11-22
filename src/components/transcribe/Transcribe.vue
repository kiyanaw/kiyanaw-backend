<template>
  <v-container fluid grid-list-md fill-height>
    <v-layout wrap>
      <div v-if="(loading || waveformLoading) && !error" class="loading">
        <v-progress-circular :size="70" :width="7" color="#305880" indeterminate />
      </div>

      <div v-if="error" class="load-error">
        {{ error }}
      </div>

      <v-flex v-if="!(loading && waveformLoading) && !error">
        <v-layout class="audio-container" :class="{ audioContainerSm: $vuetify.breakpoint.xsOnly }">
          <v-flex xs12 class="audio-player">
            <audio-player
              v-if="source"
              ref="player"
              :title="title"
              :source="source"
              :peaks="peaks"
              :regions="sortedRegions"
              :can-edit="user !== null"
              :is-video="isVideo"
              :inbound-region="inboundRegion"
              :editing-region-id="editingRegionId"
              @region-updated="onUpdateRegion"
              @region-in="highlightRegion"
              @region-out="onBlurRegion"
              @selection-action="onSelectionAction"
              @toggle-region-type="onToggleRegionType"
              @edit-title="onEditTranscriptionDetails"
              @waveform-ready="waveformLoading = false"
            />
          </v-flex>
        </v-layout>

        <v-layout
          row
          :class="{
            editor: false,
            editorNoSide: true,
            editorScroll: true,
          }"
        >
          <v-container>
            <v-flex xs12 md12 elevation-1 t-editor scroll-container>
              <v-container id="scroll-target">
                <div v-for="region in sortedRegions" :id="region.id" :key="region.id">
                  <editor
                    v-if="regions"
                    :ref="region.id"
                    :region="region"
                    :can-edit="user !== null"
                    :editing="editingRegionId === region.id"
                    :transcription-id="transcriptionId"
                    :user="user"
                    @editor-focus="onRegionFocus"
                    @editor-blur="onEditorBlur"
                    @play-region="playRegion"
                    @region-text-updated="onRegionTextUpdated"
                    @region-cursor="regionCursor"
                    @text-selection="onRegionTextSelection"
                    @delete-region="onDeleteRegion"
                  />
                  <hr />
                </div>
              </v-container>
            </v-flex>
          </v-container>
        </v-layout>

        <v-layout v-if="false" row class="editorSideMd">
          <v-container>
            <v-tabs v-if="editingRegionId" v-model="tab" background-color="grey lighten-2">
              <v-tab key="one"> Comments </v-tab>
              <v-tab key="two"> Details </v-tab>
              <v-tab-item key="one" background-color="grey lighten-2">
                Region {{ editingRegionId }} comments
              </v-tab-item>
              <v-tab-item key="two" background-color="grey lighten-2">
                Region {{ editingRegionId }} details
              </v-tab-item>
            </v-tabs>
            <p v-if="!editingRegionId" class="region-details">Select a region to view details...</p>
          </v-container>
        </v-layout>
      </v-flex>
    </v-layout>

    <v-dialog v-model="dialog" persistent max-width="60%">
      <v-card>
        <v-card-title>Transcription details</v-card-title>
        <v-card-subtitle>by {{ author }}</v-card-subtitle>
        <v-card-text>
          <v-text-field v-model="title" label="Title" required />
          <v-text-field v-model="comments" label="Notes" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="blue darken-1" text @click="dialog = false"> Cancel </v-btn>
          <v-btn color="blue darken-1" text @click="onUpdateTranscriptionDetails"> Submit </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar
      v-model="saved"
      color="success darken-1"
      data-test="transcription-saved-confirmation"
    >
      Saved!
    </v-snackbar>
  </v-container>
</template>

<script>
import Timeout from 'smart-timeout'

import AudioPlayer from './AudioPlayer.vue'
import Editor from './Editor.vue'
import TranscriptionService from '../../services/transcriptions'
// import EnvService from '../../services/env'
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
// let myCursor
// let inboundRegion = null

// used to throttle updates
// let regionUpdateTimer
// only send updates after a pause
const SEARCH_INTERVAL = 1500
const SAVE_INTERVAL = 5000

export default {
  components: {
    AudioPlayer,
    Editor,
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
      isVideo: false,
      regions: null,
      /**
       * @type {String|null}
       * @default null
       * @description Id of the region currently being edited, `null` otherwise.
       */
      editingRegionId: null,
      inboundRegion: null,
      inRegions: [],
      title: '',
      comments: '',
      author: '',
      saved: false,
      members: [],
      user: null,
      height: 0,
      //
      loading: true,
      waveformLoading: true,
      error: null,
      tab: null,
      dialog: false,
      contributors: [],
    }
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
        let realIndex = 1
        // add an index for visual aide
        for (const index in sorted) {
          if (!sorted[index].isNote) {
            sorted[index].index = realIndex
            realIndex = realIndex + 1
          }
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
    this.inboundRegion = this.$route.params.region || null

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

    // maintain a dynamic little style sheet for highlighting regions (less expensive
    // to let the browser manage the style than in vue)
    this.currentRegionSheet = document.createElement('style')
    document.body.appendChild(this.currentRegionSheet)

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
    //     this.editingRegionId = null
    //   }
    //   if (!this.editingRegionId) {
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
    this.scrollToEditorTop()
    // load up
    this.load()
  },

  methods: {
    onEditTranscriptionDetails() {
      this.dialog = true
    },
    onUpdateTranscriptionDetails() {
      this.dialog = false
      this.updateTranscription()
    },

    onToggleRegionType() {
      let targetRegion = this.regions.filter((needle) => needle.id === this.editingRegionId)

      let regionText = ''
      try {
        regionText = this.$refs[targetRegion[0].id][0].quill.getText().trim()
      } catch (e) {
        // not used
      }

      if (regionText.length > 0) {
        alert('Cannot convert non-empty region to note!')
        return
      }

      if (this.editingRegionId) {
        if (targetRegion.length) {
          targetRegion[0].isNote = !targetRegion[0].isNote
          this.$refs.player.renderRegions()

          this.saveRegion(targetRegion[0])
        }
      }
    },

    scrollToEditorTop() {
      if (!this.inboundRegion) {
        setTimeout(() => {
          try {
            document.querySelector('.editorScroll').scrollTop = 0
          } catch (e) {
            // unused
          }
        }, 200)
      }
    },

    /** */
    onEditorBlur(regionId, { silent = false } = {}) {
      // only clear the editing region if we focus away from any editor
      if (regionId === this.editingRegionId) {
        this.editingRegionId = null
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
      // setting the editingRegionId activates that region's editor
      this.editingRegionId = regionId
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

    onRegionTextUpdated(event) {
      const targetRegion = this.regions.filter((r) => r.id === event.id)[0]
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
      // TODO: disabling this for now, it locks up the editors for a minute if there
      // are a large number of regions
      // for (let region of this.regions) {
      //   // trigger update for all editors
      //   this.$refs[region.id][0].invalidateKnownWords()
      // }
    },

    async saveRegion(region) {
      if (!region.isNote) {
        window.foo = this
        const regionOps = this.$refs[region.id][0].getMainOps()
        region.text = regionOps
        region.issues = this.$refs[region.id][0].issues || '[]'
      }
      TranscriptionService.updateRegion(this.transcriptionId, region)
      this.updateTranscription()
    },

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

    onRegionTextSelection(event) {
      if (this.$refs.player) {
        this.$refs.player.onRegionTextSelection(event)
      }
    },

    onSelectionAction(action, value) {
      if (this.$refs[this.editingRegionId]) {
        this.$refs[this.editingRegionId][0].onSelectionAction(action, value)
      }
    },

    /**
     * TODO: test me
     */
    coverage() {
      let val = 0
      if (this.$refs.player && this.regions && this.regions.length) {
        const regionCoverage = this.regions.map((x) => x.end - x.start).reduce((x, y) => x + y)
        const totalLength = this.$refs.player.maxTime
        val = regionCoverage / totalLength
      }
      return (val * 100).toFixed(1)
    },

    /**
     * Update transcription data.
     */
    async updateTranscription() {
      let issueCount
      try {
        issueCount = this.regions
          .map((region) => {
            try {
              return this.$refs[region.id][0].getIssueCount()
            } catch (e) {
              console.log(e)
              return 0
            }
          })
          .reduce((a, b) => a + b)
      } catch (e) {
        console.warn(`Counldn't get issue count for regions ${e.message}`)
      }

      const result = await TranscriptionService.updateTranscription({
        id: this.transcriptionId,
        title: this.title,
        comments: this.comments,
        source: this.source,
        type: this.type,
        author: this.author,
        issues: issueCount,
        length: this.$refs.player.maxTime,
        coverage: this.coverage(),
        dateLastUpdated: +new Date(),
        userLastUpdated: this.user.name,
        // TODO: fixme
        contributors: this.contributors,
      })
      if (result) {
        this.saved = true
        setTimeout(() => {
          this.saved = false
        }, 5000)
        console.log('Transcription saved')
      }
    },

    /** */
    highlightRegion(region) {
      // this.inRegions = [region.id]
      this.currentRegionSheet.innerHTML = `#${region.id} {background-color: #edfcff;}`
      this.$nextTick(() => {
        document.getElementById(region.id).scrollIntoView()
      })
    },

    /**
     * @description Triggered when a region is no longer being edited
     */
    onBlurRegion() {
      this.currentRegionSheet.innerHTML = '.foo {}'
    },

    /**
     * @description Loads initial data based on URL params.
     */
    async load() {
      // TODO: move this to updateDataFromTranscription() for realtime updates
      const data = await TranscriptionService.getTranscription(this.transcriptionId)

      // load peaks
      let peaks
      try {
        const rawPeaks = await fetch(`${data.source}.json`)
        peaks = await rawPeaks.json()
      } catch (error) {
        console.error('Error loading peaks data', error)
        this.loading = false
        this.error = `Failed to load peaks for ${data.title}, try again shortly...`
        return
      }

      this.loading = false
      this.source = data.source
      this.title = data.title
      this.comments = data.comments
      this.type = data.type
      this.author = data.author
      this.isVideo = data.type.includes('video')
      this.regions = data.regions || []
      this.peaks = peaks
      console.log('contributors', data.contributors)
      this.contributors = data.contributors || []

      // check that the author is in the list of contributors
      const authorUser = this.contributors.filter((item) => item.name === this.user.name)
      if (!authorUser.length) {
        this.contributors.push(this.user)
      }

      // this.inboundRegion = this.$route.hash.replace('#', '') || null

      this.scrollToEditorTop()
      this.checkForLockedRegions()
    },

    /** */
    playRegion(regionId) {
      this.$refs.player.playRegion(regionId)
    },

    /** */
    onDeleteRegion(region) {
      if (confirm('Delete this region?')) {
        this.removeLocalRegion(region)
        TranscriptionService.deleteRegion(this.transcriptionId, region)
      }
    },

    async removeLocalRegion(region) {
      this.regions = this.regions.filter((r) => r.id !== region.id)
      await new Promise((resolve) => setTimeout(resolve, 50))
      this.$refs.player.renderRegions()
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
          issues: [],
          isNote: false,
        }
        this.regions.push(regionData)
        window.data = regionData
        // save the new region
        TranscriptionService.createRegion(this.transcriptionId, regionData).catch(function (error) {
          console.error('Failed to create region', error)
        })
      } else {
        let targetRegion = this.regions.filter((needle) => needle.id === regionUpdate.id)
        if (targetRegion.length) {
          // update bound data
          targetRegion = targetRegion[0]
          targetRegion.start = regionUpdate.start
          targetRegion.end = regionUpdate.end
          TranscriptionService.updateRegion(this.transcriptionId, targetRegion).catch(function (
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
          console.warn('Unable to get region locks', error)
        })
    },

    async listenForRegions() {
      TranscriptionService.listenForRegions((actionType, region) => {
        if (actionType === 'created') {
          console.log('Creating region!', region)
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
      }).catch((error) => {
        console.warn('Unable to listen for lock', error)
      })
    },
  },
}
</script>

<style>
.loading {
  width: 100%;
}
.time {
  font-family: monospace;
  font-size: x-small;
}
.audio-player {
  height: 223px;
}
.title {
  margin: 0 0 20px 0;
}
.loading {
  text-align: center;
  margin: 100px;
}
.load-error {
  text-align: center;
  font-size: 1.5em;
  padding: 20px;
  margin-top: 100px;
}
.editor,
.editorNoSide {
  position: absolute;
  top: 226px;
  left: 0;
  bottom: 0;
  overflow-y: scroll;
  padding-top: 0px;
  border-top: 1px solid #ccc;
}
.editor {
  right: 360px;
}
.editorNoSide {
  right: 0;
}

.editorSideMd {
  position: absolute;
  top: 266px;
  bottom: 0;
  right: 0;
  background-color: #f0f0f0;
}
.editorSideMd {
  left: calc(100% - 350px);
}

.audio-container {
  margin: 0 !important;
}

.controls > button {
  margin-top: 10px;
}
.region-details {
  font-weight: bold;
  color: #bbb;
  text-align: center;
  padding: 10px;
}
</style>
