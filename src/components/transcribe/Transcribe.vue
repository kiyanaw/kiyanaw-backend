<template>
  <v-container>

    <v-layout>
      <!-- <v-flex xs1></v-flex> -->
      <v-flex xs12 class="audio-player">
        <audio-player ref="player"
          v-if="audioFile"
          v-bind:audioFile="audioFile"
          v-bind:regions="regions"
          v-on:region-updated="updateRegion"
          v-on:region-in="highlightRegion"
          v-on:region-out="blurRegion">
        </audio-player>
      </v-flex>
      <!-- <v-flex xs1></v-flex> -->
    </v-layout>

    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs5>
        <h3>{{ title }}</h3>
      </v-flex>
      <v-flex xs5>
      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>

    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10 elevation-1 tEditor>
        <v-container
          id="scroll-target"
          style="max-height: 500px"
          class="scroll-y">
          <div v-for="region in sortedRegions"
            v-bind:id="region.id"
            v-bind:key="region.id">
            <editor
              v-if="regions"
              v-bind:ref="region.id"
              v-bind:regionId="region.id"
              v-bind:text="region.text"
              v-bind:start="region.start"
              v-bind:end="region.end"
              v-bind:inRegions="inRegions"
              v-bind:editing="editingRegion === region.id"
              v-on:editor-focus="editorFocus"
              v-on:editor-blur="editorBlur"
              v-on:play-region="playRegion"
              v-on:region-text-updated="regionTextUpdated"
              v-on:region-delta="regionDelta"
              v-on:delete-region="deleteRegion"
              >
            </editor>
            <hr />
          </div>
        </v-container>
      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>
    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10>
        <v-btn small color="primary" dark v-on:click="saveData">save</v-btn>
        <p v-if="saved">saved!</p>
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
import incomingData from './data'
import { setTimeout } from 'timers';
import uuid from 'uuid/v1'

let pusher
let channel
let localUuid = uuid()

export default {
  mounted() {
    
    this.transcriptionId = this.$route.params.id

    const docId = this.transcriptionId.split(':')[1]

    channel = this.$pusher.subscribe(`presence-transcribe-${EnvService.getEnvironmentName()}-${docId}`)
    channel.bind('client-region-delta', (data) => {
      this.$refs[data.name][0].insertDelta(data.delta)
    })

    channel.bind('client-region-create', (data) => {
      console.log('region created')
      console.log(data)
      this.regions.push(data)
    })

    channel.bind('client-region-update', (data) => {
      console.log('region updated')
      console.log(data)
      const targetRegion = this.regions.filter(needle => needle.id === data.id)
      console.log(targetRegion)
      if (targetRegion.length) {
        targetRegion[0].start = data.start
        targetRegion[0].end = data.end
      }
      this.$refs.player.renderRegions()
    })

    window.t = this

    document.addEventListener('keyup', (evt) => {
      if (evt.keyCode === 27) {
        this.editingRegion = null
      }
      if (!this.editingRegion) {
        // play/pause on space bar
        if (evt.keyCode === 32) {
          try {
            let canPlay = true
            for (let region of this.regions) {
              console.log(this.$refs[region.id][0].hasFocus)
              if (this.$refs[region.id][0].hasFocus) {
                canPlay = false
              }
            }
            console.log(`can play: ${canPlay}`)
            if (canPlay) {
              this.$refs.player.playPause()
            }

          } catch (e) {}
        }
        // TODO: arrows should jump between regions
        // left arrow
        // if (evt.keyCode === 37) {
        // }
      }
    })
    this.load()
  },
  data () {
    return {
      transcriptionId: null,
      audioFile: null,
      regions: null,
      editingRegion: null,
      inRegions: [],
      title: '',
      authorId: null,
      saved: false
    }
  },
  computed: {
    sortedRegions() {
      if (this.regions) {
        return this.regions.sort((a, b) => (a.start > b.start) ? 1 : -1)
      } else {
        return []
      }
    }
  },
  components: {
    AudioPlayer,
    Editor
  },
  methods: {
    editorBlur () {
      this.editingRegion = null
    },
    editorFocus (regionId) {
      this.editingRegion = regionId
    },
    regionTextUpdated (update) {
      const targetRegion = this.regions.filter(r => r.id === update.regionId)
      if (targetRegion.length) {
        targetRegion[0].text = update.text
      }
    },
    regionDelta (data) {
      data.uuid =  localUuid
      channel.trigger('client-region-delta', data)
    },
    async saveData () {
      let regions = this.regions
      for (let index in regions) {
        const regionId = regions[index].id
        const regionText = this.$refs[regionId][0].text
        regions[index].text = regionText
      }

      const result = await TranscriptionService.saveTranscription(this.authorId, {
        title: this.title,
        source: this.audioFile,
        type: 'audio',
        regions: this.sortedRegions
      })
      if (result) {
        this.saved = true
        setTimeout(() => {
          this.saved = false
        }, 3000)
      }
    },
    highlightRegion (region) {
      this.inRegions.push(region.id)
    },
    async load () {
      const data = await TranscriptionService.getTranscription(this.transcriptionId)
      this.audioFile = data.source
      this.regions = data.regions
      this.title = data.title
      this.authorId = data.authorId
    },
    blurRegion (region) {
      this.inRegions = this.inRegions.filter(r => r !== region.id);
    },
    playRegion(regionId) {
      this.$refs.player.playRegion(regionId)
    },
    deleteRegion (regionId) {
      this.regions = this.regions.filter(r => r.id !== regionId)
    },
    updateRegion (region) {
      const regionIds = this.regions.map(item => item.id)
      if (regionIds.indexOf(region.id) === -1) {
        console.log('Creating region')
        const regionData = {
          start: region.start,
          end: region.end,
          id: region.id,
          text: []
        }
        channel.trigger('client-region-create', regionData)
        this.regions.push(regionData)
      } else {
        console.log('updating region')
        const targetRegion = this.regions.filter(needle => needle.id === region.id)
        channel.trigger('client-region-update', {
          id: region.id,
          start: region.start,
          end: region.end
        })
        if (targetRegion.length) {
          targetRegion[0].start = region.start
          targetRegion[0].end = region.end
        }
      }

    }
  }

}
</script>

<style>
.tEditor {
  margin-top:20px;
  min-height: 500px;
}
.time {
  font-family: monospace;
  font-size: x-small;
}
.audio-player {
  height: 250px;
}
</style>