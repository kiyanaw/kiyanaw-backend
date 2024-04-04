<template>
  <v-layout>
    <div :style="{ visibility: loading ? 'hidden' : 'visible' }" class="waveform-container">
      <div id="minimap">
        <v-layout>
          <v-flex md6 xs6 class="media-title">
            <span>{{ transcription.title }}</span>
          </v-flex>
          <v-flex md6 xs6 class="main-time">
            {{ normalTime(currentTime) }}/{{ normalTime(maxTime) }}
          </v-flex>
        </v-layout>
      </div>
      <div id="waveform" @click="waveformClicked" />
      <div id="timeline" />
      <div id="controls" />
      <v-layout id="channel-strip">
        <v-flex xs6 class="controls">
          <v-btn icon small class="control-btn" data-testId="play-button" @click="playPause">
            <v-icon v-if="!playing"> mdi-play-circle </v-icon>
            <v-icon v-if="playing"> mdi-pause </v-icon>
          </v-btn>
          <v-btn
            v-if="canEdit"
            icon
            small
            class="control-btn"
            data-testId="mark-region"
            @click="markRegion"
          >
            <v-icon v-if="!currentRegion" small> mdi-contain-start </v-icon>
            <v-icon v-if="currentRegion" small> mdi-contain-end </v-icon>
          </v-btn>
          <v-btn icon small :disabled="!currentRegion" class="control-btn" @click="cancelRegion">
            <v-icon small> mdi-close-circle </v-icon>
          </v-btn>

          <v-btn icon disabled class="control-btn"> | </v-btn>

          <v-btn icon small class="control-btn" @click="onLookup">
            <v-icon small> mdi-card-search </v-icon>
          </v-btn>

          <v-btn icon small class="control-btn" @click="onDelete">
            <v-icon small> mdi-delete-forever </v-icon>
          </v-btn>
        </v-flex>

        <v-flex md3 hidden-sm-and-down>
          <v-slider v-model="zoom" max="75" min="5" class="slider" condensed>
            <template v-slot:prepend>
              <v-icon medium @click="zoom = 40"> mdi-magnify-plus-outline </v-icon>
            </template>
          </v-slider>
        </v-flex>

        <v-flex md3 hidden-sm-and-down class="controls">
          <v-slider v-model="speed" max="150" min="50" class="slider">
            <template v-slot:prepend>
              <v-icon medium @click="speed = 100"> mdi-run </v-icon>
            </template>
          </v-slider>
        </v-flex>
      </v-layout>
    </div>
    <video
      v-if="isVideo"
      id="video"
      preload="auto"
      title="mp4"
      controls
      playsinline
      webkit-playsinline
      :class="{
        videoLeft: videoLeft,
        videoRight: !videoLeft,
        video: true,
        videoSmall: $vuetify.breakpoint.xsOnly,
      }"
      @click="videoLeft = !videoLeft"
    >
      <source :src="source" />
      <v-icon>mdi-swap-horizontal</v-icon>
    </video>
  </v-layout>
</template>

<script>
import WaveSurfer from 'wavesurfer.js'
import RegionPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js'
// import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js'

import { mapGetters, mapActions } from 'vuex'

// import soundtouch from './lib/soundtouch'
import utils from './utils'
// import Timeout from 'smart-timeout'

import 'mediaelement'

let surfer = null
// let playingRegionId = null
let cacheTime = 0

const regionRegularBackground = 'rgba(0, 0, 0, 0.1)'
const regionHighlightedBackground = 'rgba(0, 213, 255, 0.1)'

export default {
  props: [
    /**
     * The URL of the file to load.
     * TODO: this should be 'media' to accommodate video in the future.
     */
    'source',
    /**
     * Currently not used.
     * TODO: remove
     */
    'peaks',
    /**
     * When `true`, region creation and manipulation will be enabled.
     */
    'canEdit',
    /**
     * If a region was specified in the parent editor, the player will be advanced to the
     * inboundRegion.start time in anticipation of a 'play' event.
     */
    'inboundRegion',
    /**
     * Bound array, changes will notify parent components.
     */
    // 'regions',
    'isVideo',
    'title',
    'editingRegionId',
  ],
  data() {
    return {
      // TODO: figure out what items we're not using
      currentTime: 0,
      maxTime: 0,
      currentRegion: null,
      pendingInboundRegion: null,
      loadingProgress: 0,
      loading: true,
      textRegions: {},
      zoom: 40,
      speed: 100,
      playing: false,
      // track which side of the screen the video is on
      videoLeft: false,
      showRegionControls: false,
      showNoteControls: false,
      showIgnoreControl: false,
      showIssueControl: false,
      issueSelected: false,
    }
  },

  computed: {
    ...mapGetters(['regions', 'transcription']),
  },

  watch: {
    regions: {
      deep: true,
      handler() {
        this.renderRegions()
      },
    },

    zoom(newValue) {
      try {
        surfer.zoom(newValue)
        localStorage.zoom = newValue
      } catch (e) {
        console.warn(e)
      }
    },
    speed(newValue) {
      surfer.setPlaybackRate(newValue / 100)
    },
    inboundRegion(newValue) {
      // player has been initiated elsewhere, clear pending inbound region
      if (newValue === null) {
        this.pendingInboundRegion = null
      }
    },
  },

  async mounted() {
    var me = this
    this.pendingInboundRegion = this.$props.inboundRegion

    try {
      surfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#305880',
        progressColor: '#162738',
        scrollParent: true,
        backend: 'MediaElement',
        mediaType: 'video',
        barWidth: 2,
        plugins: [
          RegionPlugin.create({
            regions: [],
          }),
          TimelinePlugin.create({
            container: '#timeline',
          }),
          // TODO: try the minimap plugin again at some point, wasn't working with peaks data
        ],
      })
    } catch (error) {
      console.error('Could not mount wavesurfer', error.message)
    }

    // in the test suite, there is a lot of noise because there is no media element.
    if (surfer) {
      surfer.on('audioprocess', (event) => {
        const currentTime = event.toFixed(3) // 0.109
        if (currentTime !== cacheTime) {
          this.currentTime = currentTime
          cacheTime = currentTime
        }
      })

      /**
       * TODO: there are like 3 'ready' handlers
       */
      surfer.on('ready', () => {
        me.maxTime = surfer.backend.getDuration()
        me.textRegions = me.regions
      })

      if (this.canEdit) {
        surfer.enableDragSelection({ slop: 5 })
      }

      surfer.on('play', () => {
        this.playing = true
      })

      surfer.on('pause', () => {
        this.playing = false
      })

      surfer.on('loading', (value) => {
        this.loadingProgress = value
      })

      surfer.on('region-click', (event) => {
        // if we are a viewer only, play this region
        if (!this.canEdit) {
          // this.$emit('play-region', event.id)
          // this.playRegion(event.id)
          setTimeout(() => {
            this.playRegion(event.id)
          }, 25)
        }
      })

      /**
       * This event fires when both a region is created, and when it is updated.
       */
      surfer.on('region-update-end', (event) => {
        // this.$emit('region-updated', event)
        this.onRegionUpdate(event)
      })

      /** */
      surfer.on('region-in', (region) => {
        this.onRegionIn(region.id)
      })

      surfer.on('region-out', (region) => {
        this.onRegionOut(region.id)
      })

      surfer.on('seek', this.onPlayerSeek)

      let regionsRendered = false
      surfer.on('ready', () => {
        // for some reason wavesurfer fires the loaded event like 100 times
        if (!regionsRendered) {
          this.loadIsReady()
          regionsRendered = true
        }
      })
      // TODO: move peaks loading to Transcribe
      // TODO: test when peaks data is 404

      if (this.isVideo) {
        surfer.load(document.querySelector('#video'), this.peaks.data)
      } else {
        surfer.load(this.source, this.peaks.data)
      }

      if (this.canEdit && localStorage.zoom) {
        this.zoom = localStorage.zoom
      } else {
        this.zoom = 30
      }
      window.surfer = surfer
      window.audio = this
    }
  },

  methods: {
    ...mapActions(['deleteTranscription']),

    onToggleRegionType: function () {
      this.$emit('toggle-region-type')
    },

    onDelete: async function () {
      if (confirm('Delete transcription and all regions?')) {
        await this.deleteTranscription()
        this.$router.push('/transcribe-list')
      }
    },  

    onPlayerSeek: function (progressPercent) {
      this.currentTime = this.maxTime * progressPercent
    },

    waveformClicked: function () {
      // clear out any pending region if we click somewhere in the waveform
      if (this.pendingInboundRegion) {
        this.onRegionOut(this.pendingInboundRegion)
        this.pendingInboundRegion = null
      }
    },

    loadIsReady: function () {
      this.loading = false
      this.renderRegions()
      if (this.inboundRegion) {
        try {
          const startTime = surfer.regions.list[this.inboundRegion].start
          const maxTime = this.maxTime
          surfer.seekAndCenter(startTime / maxTime)
          // this.$emit('region-in', {id: this.inboundRegion})
          this.onRegionIn(this.inboundRegion)
        } catch (e) {
          // unused
        }
      }
      if (this.isVideo) {
        document.querySelector('video').style.display = 'block'
      }
      this.$emit('waveform-ready')
    },

    cancelRegion: function () {
      this.currentRegion = null
    },

    playPause: function () {
      // check if there's an inbound region we need to play, otherwise just play
      if (this.pendingInboundRegion) {
        this.playRegion(this.pendingInboundRegion)
        this.pendingInboundRegion = null
      } else {
        surfer.playPause()
      }
    },

    markRegion: function () {
      if (this.currentRegion) {
        const regionData = {
          id: `wavesurfer_${+new Date()}`,
          start: this.currentRegion,
          end: surfer.getCurrentTime(),
        }
        surfer.addRegion(regionData)
        this.$emit('region-updated', regionData)
        this.currentRegion = null
      } else {
        this.currentRegion = surfer.getCurrentTime()
      }
    },

    normalTime: function (value) {
      return utils.floatToMSM(value)
    },

    playRegion(regionId) {
      surfer.regions.list[regionId].play()
    },

    renderRegions() {
      surfer.clearRegions()

      for (const original of this.regions) {
        // make a copy of the original so we don't trigger futher updates
        const region = { ...original }
        if (region && !region.isNote) {
          region.resize = this.canEdit
          region.drag = this.canEdit
          region.attributes = {
            label: region.displayIndex,
            index: region.index,
            displayIndex: region.displayIndex,
          }
          surfer.addRegion(region)
        }
      }

      this.textRegions = this.regions
    },

    /** */
    onRegionIn(regionName) {
      document.querySelector(
        `[data-id="${regionName}"]`,
      ).style.backgroundColor = regionHighlightedBackground
      this.$emit('region-in', { id: regionName })
    },

    /** */
    onRegionOut(regionName) {
      const element = document.querySelector(`[data-id="${regionName}"]`)
      if (element) {
        element.style.backgroundColor = regionRegularBackground
      }
      this.$emit('region-out', { id: regionName })
    },

    onRegionTextSelection(event) {
      // we have a selection
      if (typeof event === 'boolean' && event) {
        this.showRegionControls = !!event
        this.showIgnoreControl = !!event
        this.showIssueControl = !!event
      } else if (event['issue-needs-help']) {
        // const issue = event['issue-needs-help']
        this.showRegionControls = false
        this.showIgnoreControl = false
        this.showIssueControl = true
        this.issueSelected = true
      } else {
        this.showRegionControls = false
        this.showIgnoreControl = false
        this.showIssueControl = false
        this.issueSelected = false
      }
    },

    onRegionUpdate(event) {
      this.$emit('region-updated', {
        id: event.id,
        start: event.start,
        end: event.end,
        index: event.attributes.index,
      })
    },

    onLookup() {
      this.$emit('lookup')
    },

    // emitSelectionAction(action, value) {
    //   this.$emit('selection-action', action, value)
    // },

    // onFlagSelectionClick() {
    //   this.emitSelectionAction('flag-selection')
    // },

    // onIgnoreSelectionClick() {
    //   this.emitSelectionAction('ignore-selection')
    // },

    // onClearFormatClick() {
    //   this.emitSelectionAction('clear-format')
    // },
  },
}
</script>

<style>
#loading {
  height: 200px;
  text-align: center;
  padding: 60px;
}
.wavesurfer-handle-start {
  border-left: 1px solid #999;
  background-color: #999 !important;
  width: 1px !important;
}
.wavesurfer-handle-end {
  border-right: 1px solid #999;
  background-color: #999 !important;
  width: 1px !important;
}
#minimap {
  background-color: #dbdbdb;
  height: 32px;
  margin-top: -4px;
  margin-bottom: 1px;
  margin-left: -1px;
  color: #111;
}
.media-title {
  text-transform: uppercase;
  font-weight: bolder;
  padding-left: 15px !important;
  height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.main-time {
  text-align: right;
  padding-right: 15px !important;
  padding-top: 6px !important;
  font-weight: bolder;
}
.slider {
  padding-right: 10px;
}
.time {
  text-align: center;
}
.main-time {
  font-size: 0.9em !important;
}

region.wavesurfer-region:before {
  content: attr(data-region-label);
  position: absolute;
  bottom: 0;
  left: 0;
  margin: 5px 5px 0;
  color: #b6b6b6;
  font-size: 20px;
  font-weight: bolder;
}

video {
  display: none;
  position: fixed;
  bottom: 15px;
  max-width: 350px;
  max-height: 350px;
  z-index: 190;
  box-shadow: 0px 0px 6px 0px #888888;
  cursor: pointer;
}

.videoRight {
  right: 15px;
}
.videoLeft {
  left: 15px;
}

.videoSmall {
  max-width: 250px !important;
  max-height: 200px !important;
}

.waveform-container {
  width: 100%;
}
div#channel-strip {
  height: 40px;
  overflow: hidden;
  background-color: #f0f0f0;
  margin-left: -18px;
  margin-right: -20px;
  padding-left: 20px;
  margin-top: 5px;
}

/**
 this is all just to get the buttons lined up on the transport
 */
#channel-strip > .flex {
  margin-top: -13px;
}

.control-btn,
.slider {
  margin-top: 12px;
}
.waveform-container {
  margin-left: 1px;
}
</style>
