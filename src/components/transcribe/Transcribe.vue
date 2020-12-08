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
              @region-in="onPlaybackRegionIn"
              @region-out="onPlaybackRegionOut"
              @waveform-ready="waveformLoading = false"
            />
          </v-flex>
        </v-layout>

        <v-layout row class="editor editorNoSide editorScroll">
          <v-container>
            <stationary-editor></stationary-editor>
          </v-container>
        </v-layout>

        <v-layout row class="editorSideMd" style="overflow-y: scroll">
          <v-container>
            <div
              v-for="region in sortedRegions"
              :id="region.id"
              :key="region.id"
              @click="playSpecificRegion(region.id)"
            >
              <region-partial
                :data="region"
                :locked="lockedRegionNames.includes(region.id)"
                :lockedByMe="
                  locks[region.id] ? (locks[region.id].user === user.name ? true : false) : false
                "
              ></region-partial>
            </div>
          </v-container>
        </v-layout>
      </v-flex>
    </v-layout>

    <v-snackbar
      :value="saved"
      color="success darken-1"
      data-test="transcription-saved-confirmation"
    >
      Saved!
    </v-snackbar>
  </v-container>
</template>

<script>
// import Timeout from 'smart-timeout'
import AudioPlayer from './AudioPlayer.vue'

import StationaryEditor from './StationaryEditor.vue'
import TranscriptionService from '../../services/transcriptions'

import RegionPartial from './RegionPartial.vue'
import UserService from '../../services/user'

import { setTimeout } from 'timers'
import { mapActions, mapGetters } from 'vuex'

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
// const SEARCH_INTERVAL = 1500
// const SAVE_INTERVAL = 5000

export default {
  components: {
    AudioPlayer,
    // Editor,
    RegionPartial,
    StationaryEditor,
  },

  data() {
    return {
      /**
       * @type {String}
       * @description ID of the transcription.
       */
      source: null,
      peaks: null,
      isVideo: false,
      /**
       * @type {String|null}
       * @default null
       * @description Id of the region currently being edited, `null` otherwise.
       */
      editingRegionId: null,
      inboundRegion: null,
      // inRegions: [],
      title: '',
      // comments: '',
      author: '',
      members: [],
      user: null,
      height: 0,
      //
      loading: true,
      waveformLoading: true,
      error: null,
      tab: null,
      contributors: [],
    }
  },

  computed: {
    ...mapGetters([
      'lockedRegionNames',
      'locks',
      'regions',
      'saved',
      'selectedRegion',
      'transcription',
    ]),
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
    this.$store.dispatch('setSelectedRegion', this.inboundRegion)

    // this.listenForRegions()
    // this.listenForLockedRegions()

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
     * Listen for <space> event (and others) to interact with the waveform.
     */
    // document.addEventListener('keyup', (event) => {
    //   // play/pause on space bar
    //   if (event.keyCode === 32) {
    //     this.$refs.player.playPause()
    //   }
    // })

    this.scrollToEditorTop()
    // load up
    this.load()
  },

  methods: {
    ...mapActions(['getLockedRegions', 'setSelectedRegion', 'setTranscription']),

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
     * Handler for the playback head entering a region.
     */
    onPlaybackRegionIn(region) {
      console.log('TODO: highlight region should be moved')
      // this.inRegions = [region.id]
      this.currentRegionSheet.innerHTML = `#${region.id} {background-color: #edfcff;}`
      this.$nextTick(() => {
        document.getElementById(region.id).scrollIntoView()
      })

      this.$store.dispatch('setSelectedRegion', region.id)
    },

    /**
     * Handler for the playback head leaving a region.
     */
    onPlaybackRegionOut() {
      this.currentRegionSheet.innerHTML = '.foo {}'
    },

    /**
     * @description Loads initial data based on URL params.
     */
    async load() {
      // TODO: move to loading through VueX
      const data = await TranscriptionService.getTranscription(this.transcriptionId)
      this.setTranscription(data)

      // legacy
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

      // TODO: bind this to the data store
      this.loading = false
      this.source = data.source
      this.title = data.title
      // this.comments = data.comments
      this.type = data.type
      this.author = data.author
      this.isVideo = data.type.includes('video')
      // this.regions = data.regions || []
      // console.log('this.regions', this.regions)
      this.peaks = peaks
      // console.log('contributors', data.contributors)
      this.contributors = data.contributors || []

      // TODO: fix contributors
      // check that the author is in the list of contributors
      // const authorUser = this.contributors.filter((item) => item.name === this.user.name)
      // if (!authorUser.length) {
      //   this.contributors.push(this.user)
      // }

      this.scrollToEditorTop()

      // Request all locked regions on load
      this.getLockedRegions()
    },

    /**
     * Handle click from the region list, play the region specified.
     */
    playSpecificRegion(regionId) {
      // TODO: should this be set in the editor?
      this.setSelectedRegion(regionId)

      if (!this.selectedRegion.isNote) {
        this.$refs.player.playRegion(regionId)
        // Set the history in the URL to link to this region
      }
      const newRoute = `/transcribe-edit/${this.transcriptionId}/${regionId}`
      if (this.$router.history.current.path !== newRoute) {
        this.$router.push({ path: newRoute })
      }

      // TODO: history between regions
    },

    onUpdateRegion() {
      console.log('TODO: need to update region from audio player')
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
  padding-top: 0px;
  border-top: 1px solid #ccc;
}
.editor {
  right: calc(100% - 50%);
}

.editorSideMd {
  position: absolute;
  top: 226px;
  bottom: 0;
  right: 0;
  background-color: white;
}
.editorSideMd {
  left: calc(100% - 50%);
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

.region-preview {
  border: 1px solid grey;
}

/* Classes for words/issues */
[class^='known-word'] {
  color: blue;
}

[class^='ignore-word'] {
  color: #777;
  font-style: italic;
}

[class^='issue-needs-help'] {
  background-color: #ffe6e6;
}

[class^='issue-indexing'] {
  background-color: #fff9e6;
}

[class^='issue-new'] {
  background-color: #e6f3ff;
}

[class^='issue']::before {
  content: '[';
}
[class^='issue']::after {
  content: ']';
}
</style>
