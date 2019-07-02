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
    <div id="minimap"></div>
    <div id="waveform"></div>
    <div id="timeline"></div>
    <div id="controls" v-bind:style="{visibility: loading ? 'hidden' : 'visible'}">
      <v-layout>
        <v-flex xs3>
          <v-btn flat icon v-on:click="playPause">
            <v-icon v-if="!playing">play_arrow</v-icon>
            <v-icon v-if="playing">pause</v-icon>
          </v-btn>
          <v-btn flat icon v-on:click="markRegion"><v-icon>play_for_work</v-icon></v-btn>
          <v-btn flat icon v-on:click="cancelRegion" v-if="currentRegion"><v-icon>clear</v-icon></v-btn>
          <span class="time">{{ normalTime(currentTime) }} - {{ normalTime(maxTime) }}</span>
        </v-flex>
        <v-flex xs3>

        </v-flex>
        <v-flex xs3>
          <v-slider v-model="zoom"
            max="75" min="5"
            label="Zoom"
            >
          </v-slider>
        </v-flex>

        <v-flex xs3>
          <!-- <v-slider v-model="speed"
            max="15" min="5"
            label="Speed"
            >
          </v-slider> -->
        </v-flex>

      </v-layout>
    </div>
  </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js';
import RegionPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js'

import TextManager from './text-manager'
import utils from './utils'

let surfer = null
let cacheTime = 0

export default {
  props: [
    'audioFile',
    'regions'
  ],
  async mounted () {
    var me = this
    surfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'violet',
        progressColor: 'purple',
        scrollParent: true,
        barWidth: 1,
        plugins: [
          RegionPlugin.create({
            regions: []
          }),
          TimelinePlugin.create({
            container: "#timeline"
          }),
            MinimapPlugin.create({
                container: '#minimap',
                waveColor: '#777',
                progressColor: '#222',
                height: 30
            })
        ]
    });

    surfer.on('audioprocess', function (event) {
      const currentTime = event.toFixed(3)
      if (currentTime !== cacheTime) {
        me.currentTime = currentTime
        cacheTime = currentTime
      }
    })

    surfer.on('seek', function (event) {
      me.currentTime = me.maxTime * event
      surfer.playPause();
      surfer.playPause();
    })

    surfer.on('ready', function (event) {
      me.maxTime = surfer.backend.getDuration()
      me.regions.forEach(function (region) {
        surfer.addRegion(region)
      })
      me.textRegions = me.regions
    })

    surfer.enableDragSelection({slop: 5})

    surfer.on('ready', () => {
      this.loading = false
      this.renderRegions()
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
        region.once('out', function() {
            // surfer.play(region.start);
            surfer.pause();
        });
        region.once('pause', function () {
          surfer.un('out')
        })
    });

    surfer.on('region-update-end', function (event) {
      me.$emit('region-updated', event)
    })

    surfer.on('region-in', (region) => {
      this.$emit('region-in', region)
    })

    surfer.on('region-out', (region) => {
      this.$emit('region-out', region)
    })

    surfer.load(this.audioFile);
    window.surfer = surfer
  },
  methods: {
    cancelRegion: function () {
      this.currentRegion = null
    },
    playPause: function () {
      surfer.playPause()
    },
    markRegion: function () {
      if (this.currentRegion) {
        surfer.addRegion({
          start: this.currentRegion,
          end: surfer.getCurrentTime()
        })
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
      this.regions.forEach((region) => {
        surfer.addRegion(region)
      })
      this.textRegions = this.regions
    }
  },
  watch: {
    regions (newValue, oldValue) {
      this.renderRegions(newValue)
    },
    zoom (newValue, oldValue) {
      surfer.zoom(newValue)
    },
    speed (newValue, oldValue) {
      surfer.setPlaybackRate(newValue / 10)
    }
  },
  data () {
    return {
      currentTime: 0,
      maxTime: 0,
      currentRegion: null,
      loadingProgress: 0,
      loading: true,
      textRegions: {},
      zoom: 20,
      speed: 10,
      playing: false
    }
  }
}
</script>

<style>
#loading {
  height: 200px;
  text-align: center;
  padding: 60px;
}
.wavesurfer-handle {
  border-left: 1px solid #999;
}
</style>