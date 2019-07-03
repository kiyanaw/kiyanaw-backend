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
        <v-flex xs4>
          <v-btn flat icon v-on:click="playPause">
            <v-icon v-if="!playing">play_arrow</v-icon>
            <v-icon v-if="playing">pause</v-icon>
          </v-btn>
          <v-btn flat icon v-on:click="markRegion"><v-icon>format_shapes</v-icon></v-btn>
          <v-btn flat icon v-on:click="cancelRegion" v-if="currentRegion"><v-icon>clear</v-icon></v-btn>
        </v-flex>
        <v-flex xs6 class="time">
          <span>{{ normalTime(currentTime) }} - {{ normalTime(maxTime) }}</span>
        </v-flex>
        <v-flex xs2>
          <v-slider v-model="zoom" max="75" min="5"
            prepend-icon="zoom_in" class="slider"></v-slider>
        </v-flex>

        <v-flex xs2>
          <v-slider v-model="speed" max="12" min="8"
            prepend-icon="directions_run" class="slider"></v-slider>
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
import TextManager from './text-manager'
import utils from './utils'
import { setTimeout } from 'timers'

let surfer = null
let playingRegionId = null
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
      // surfer.playPause();
      // surfer.playPause();
    })

    surfer.on('ready', function (event) {
      me.maxTime = surfer.backend.getDuration()
      me.regions.forEach(function (region) {
        surfer.addRegion(region)
      })
      me.textRegions = me.regions
    })

    surfer.on('ready', function() {
      var st = new soundtouch.SoundTouch(
          surfer.backend.ac.sampleRate
      );
      var buffer = surfer.backend.buffer;
      var channels = buffer.numberOfChannels;
      var l = buffer.getChannelData(0);
      var r = channels > 1 ? buffer.getChannelData(1) : l;
      var length = buffer.length;
      var seekingPos = null;
      var seekingDiff = 0;

      var source = {
          extract: function(target, numFrames, position) {
              if (seekingPos != null) {
                  seekingDiff = seekingPos - position;
                  seekingPos = null;
              }

              position += seekingDiff;

              for (var i = 0; i < numFrames; i++) {
                  target[i * 2] = l[i + position];
                  target[i * 2 + 1] = r[i + position];
              }

              return Math.min(numFrames, length - position);
          }
      };

      var soundtouchNode;

      surfer.on('play', function() {
          seekingPos = ~~(surfer.backend.getPlayedPercents() * length);
          console.log(seekingPos)
          st.tempo = surfer.getPlaybackRate();

          if (st.tempo === 1) {
              surfer.backend.disconnectFilters();
          } else {
              if (!soundtouchNode) {
                  var filter = new soundtouch.SimpleFilter(source, st);
                  soundtouchNode = soundtouch.getWebAudioNode(
                      surfer.backend.ac,
                      filter
                  );
              }
              surfer.backend.setFilter(soundtouchNode);
          }
      });

      surfer.on('pause', function() {
          soundtouchNode && soundtouchNode.disconnect();
      });

      surfer.on('seek', function() {
          seekingPos = ~~(surfer.backend.getPlayedPercents() * length);
          console.log(seekingPos)
      });
    });

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
      // no actions just yet
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
    if (localStorage.zoom) {
      this.zoom = localStorage.zoom
    }
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
      localStorage.zoom = newValue
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
      zoom: 35,
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
.slider {
  padding-right: 10px;
}
.time {
  padding-top: 25px;
  text-align: center;
}
</style>