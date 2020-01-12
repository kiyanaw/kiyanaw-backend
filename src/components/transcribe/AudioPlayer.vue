<template>
  <div>
    <div id="loading" v-if="loading">
      <v-progress-circular
        v-bind:value="loadingProgress"
        :width="6"
        :size="50"
        color="purple"
      ></v-progress-circular>
      <h5>Loading audio...</h5>
    </div>
    <div v-bind:style="{ visibility: loading ? 'hidden' : 'visible' }">
      <div id="minimap"></div>
      <div id="waveform" v-on:click="waveformClicked"></div>
      <div id="timeline"></div>
      <div id="controls"></div>
      <v-layout>
        <v-flex xs3 class="controls">
          <v-btn flat icon v-on:click="playPause" class="control-btn">
            <v-icon v-if="!playing">play_arrow</v-icon>
            <v-icon v-if="playing">pause</v-icon>
          </v-btn>
          <v-btn flat icon v-if="canEdit" v-on:click="markRegion" class="control-btn"
            ><v-icon>content_cut</v-icon></v-btn
          >
          <v-btn flat icon v-on:click="cancelRegion" v-if="currentRegion" class="control-btn"
            ><v-icon>clear</v-icon></v-btn
          >
          <v-btn flat icon v-on:click="speed = 100" class="control-btn"><v-icon></v-icon>R</v-btn>
        </v-flex>

        <v-flex xs6 class="time main-time">
          <span>{{ normalTime(currentTime) }} - {{ normalTime(maxTime) }}</span>
        </v-flex>

        <v-flex md3 hidden-sm-and-down>
          <v-slider
            v-model="zoom"
            max="75"
            min="5"
            prepend-icon="zoom_in"
            class="slider"
          ></v-slider>
        </v-flex>

        <v-flex md3 hidden-sm-and-down>
          <v-slider
            v-model="speed"
            max="150"
            min="50"
            prepend-icon="directions_run"
            class="slider"
          ></v-slider>
        </v-flex>
      </v-layout>
    </div>
  </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js'
import RegionPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js'

import soundtouch from './lib/soundtouch'
import utils from './utils'
// import { setTimeout } from "timers";
import Timeout from 'smart-timeout'

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
    'audioFile',
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
    'regions',
  ],

  async mounted() {
    var me = this
    this.pendingInboundRegion = this.$props.inboundRegion
    surfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: 'violet',
      progressColor: 'purple',
      scrollParent: true,
      backend: 'MediaElement',
      barWidth: 1,
      plugins: [
        RegionPlugin.create({
          regions: [],
        }),
        TimelinePlugin.create({
          container: '#timeline',
        }),
        MinimapPlugin.create({
          container: '#minimap',
          waveColor: '#777',
          progressColor: '#222',
          height: 30,
        }),
      ],
    })

    surfer.on('audioprocess', (event) => {
      const currentTime = event.toFixed(3) // 0.109
      if (currentTime !== cacheTime) {
        this.currentTime = currentTime
        cacheTime = currentTime
      }
    })

    // surfer.on('seek', function (event) {
    //   me.currentTime = me.maxTime * event
    // })
    surfer.on('seek', function(event) {
      // here
    })

    /**
     * TODO: there are like 3 'ready' handlers
     */
    surfer.on('ready', function(event) {
      me.maxTime = surfer.backend.getDuration()
      me.regions.forEach(function(region) {
        surfer.addRegion(region)
      })
      me.textRegions = me.regions
    })

    if (this.canEdit) {
      surfer.enableDragSelection({ slop: 5 })
    }

    surfer.on('ready', () => {
      this.loadIsReady()
    })

    surfer.on('play', () => {
      this.playing = true
    })

    surfer.on('pause', () => {
      this.playing = false
    })

    surfer.on('loading', (value) => {
      this.loadingProgress = value
    })

    surfer.on('region-play', function(region) {
      // no actions just yet
    })

    /**
     * This event fires when both a region is created, and when it is updated.
     */
    surfer.on('region-update-end', function(event) {
      me.$emit('region-updated', event)
    })

    /** */
    surfer.on('region-in', (region) => {
      this.onRegionIn(region.id)
    })

    surfer.on('region-out', (region) => {
      this.onRegionOut(region.id)
    })

    surfer.load(this.audioFile)

    if (this.canEdit && localStorage.zoom) {
      this.zoom = localStorage.zoom
    } else {
      this.zoom = 30
    }
    window.surfer = surfer
    window.audio = this
  },
  methods: {
    onPlayerSeek: function() {
      this.currentTime = me.maxTime * event
    },

    waveformClicked: function() {
      // clear out any pending region if we click somewhere in the waveform
      if (this.pendingInboundRegion) {
        this.onRegionOut(this.pendingInboundRegion)
        this.pendingInboundRegion = null
      }
    },
    loadIsReady: function() {
      this.loading = false
      this.renderRegions()
      if (this.inboundRegion) {
        const startTime = surfer.regions.list[this.inboundRegion].start
        const maxTime = this.maxTime
        surfer.seekAndCenter(startTime / maxTime)
        // this.$emit('region-in', {id: this.inboundRegion})
        this.onRegionIn(this.inboundRegion)
      }
    },
    cancelRegion: function() {
      this.currentRegion = null
    },
    playPause: function() {
      // check if there's an inbound region we need to play, otherwise just play
      if (this.pendingInboundRegion) {
        this.playRegion(this.pendingInboundRegion)
        this.pendingInboundRegion = null
      } else {
        surfer.playPause()
      }
    },
    markRegion: function() {
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
    normalTime: function(value) {
      return utils.floatToMSM(value)
    },
    playRegion(regionId) {
      surfer.regions.list[regionId].play()
    },
    renderRegions() {
      Timeout.clear('render-regions')
      Timeout.set(
        'render-regions',
        () => {
          surfer.clearRegions()
          console.log('rendering regions')
          this.regions.forEach((region, index) => {
            console.log('rendering region', region.id)
            region.resize = this.canEdit
            region.drag = this.canEdit
            region.attributes = {
              label: index,
            }
            surfer.addRegion(region)
          })
          this.textRegions = this.regions
        },
        50,
      )
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
      document.querySelector(
        `[data-id="${regionName}"]`,
      ).style.backgroundColor = regionRegularBackground
      this.$emit('region-out', { id: regionName })
    },
  },
  watch: {
    regions(newValue, oldValue) {
      this.renderRegions(newValue)
    },
    zoom(newValue, oldValue) {
      surfer.zoom(newValue)
      localStorage.zoom = newValue
    },
    speed(newValue, oldValue) {
      surfer.setPlaybackRate(newValue / 100)
    },
  },
  data() {
    return {
      currentTime: 0,
      maxTime: 0,
      currentRegion: null,
      pendingInboundRegion: null,
      loadingProgress: 0,
      loading: true,
      textRegions: {},
      zoom: 35,
      speed: 100,
      playing: false,
    }
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
.slider {
  padding-right: 10px;
}
.time {
  text-align: center;
}
.main-time {
  margin: 20px 0 0 0;
  font-size: 1.2em !important;
}
.controls {
}
.control-btn {
  margin-top: 15px;
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
</style>
