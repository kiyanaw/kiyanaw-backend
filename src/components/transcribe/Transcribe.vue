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
              :regions="regions"
              :can-edit="user !== null"
              :is-video="isVideo"
              :inbound-region="inboundRegion"
              :editing-region-id="editingRegionId"
              @region-updated="onAudioPlayerUpdateRegion"
              @region-in="onPlaybackRegionIn"
              @region-out="onPlaybackRegionOut"
              @waveform-ready="waveformLoading = false"
            />
          </v-flex>
        </v-layout>

        <v-layout
          row
          class="editor editorNoSide editorScroll"
          :class="{ hideEditor: $vuetify.breakpoint.xsOnly }"
        >
          <v-container>
            <stationary-editor @play-region="triggerAudioPlayer"></stationary-editor>
          </v-container>
        </v-layout>

        <v-layout row class="editorSideMd" :class="{ editorSideSm: $vuetify.breakpoint.xsOnly }">
          <virtual-list
            style="height: 360px; overflow-y: auto; width: 100%; height: 100%"
            ref="regionList"
            :data-key="'id'"
            :data-sources="regions"
            :data-component="itemComponent"
            :estimate-size="regions.length"
            @region-click="playSpecificRegion"
          />
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
import VirtualList from 'vue-virtual-scroll-list'
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

export default {
  components: {
    AudioPlayer,
    StationaryEditor,
    VirtualList,
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
      title: '',
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

      itemComponent: RegionPartial,
      itemScrollIndex: 0,
    }
  },

  computed: {
    ...mapGetters(['regionById', 'regions', 'saved', 'selectedRegion', 'transcription']),
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
    ...mapActions([
      'createRegion',
      'getLockedRegions',
      'setRegions',
      'setSelectedRegion',
      'setTranscription',
      'updateRegionById',
    ]),

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
    onPlaybackRegionIn(partRegion) {
      // const region = this.regions.filter((item) => item.id === partRegion.id).shift()
      const region = this.regionById(partRegion.id)

      console.log('region index', region.indesx)

      this.currentRegionSheet.innerHTML = `#${partRegion.id} {background-color: #edfcff;}`
      this.$refs.regionList.scrollToIndex(region.index)
      this.$store.dispatch('setSelectedRegion', partRegion.id)

      this.itemScrollIndex = 0
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

    triggerAudioPlayer(regionId) {
      this.$refs.player.playRegion(regionId)
    },

    /**
     * Handle click from the region list, play the region specified.
     */
    playSpecificRegion(regionId, index) {
      // set so we can scroll the virtual list to the specific index
      this.itemScrollIndex = index

      this.setSelectedRegion(regionId)

      if (!this.selectedRegion.isNote) {
        this.triggerAudioPlayer(regionId)
        // Set the history in the URL to link to this region
      }
      const newRoute = `/transcribe-edit/${this.transcriptionId}/${regionId}`
      if (this.$router.history.current.path !== newRoute) {
        this.$router.push({ path: newRoute })
      }

      // TODO: history between regions
    },

    onAudioPlayerUpdateRegion(regionUpdate) {
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

        this.createRegion(regionData)
      } else {
        this.updateRegionById({
          id: regionUpdate.id,
          update: {
            start: regionUpdate.start,
            end: regionUpdate.end,
          },
        })
      }
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
.editorSideSm {
  left: 0;
}

.hideEditor {
  display: none;
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

[class^='issue-']::before {
  content: '[';
}
[class^='issue-']::after {
  content: ']';
}
</style>
