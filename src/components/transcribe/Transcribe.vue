<template>
  <v-container>

    <v-layout>
      <!-- <v-flex xs1></v-flex> -->
      <v-flex xs12 class="audio-player">
        <audio-player ref="player"
          v-if="audioFile"
          v-bind:audioFile="audioFile"
          v-bind:regions="regions"
          v-bind:canEdit="user !== null"
          v-bind:inboundRegion="inboundRegion"
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
              v-bind:canEdit="user !== null"
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
              v-on:region-cursor="regionCursor"
              v-on:delete-region="deleteRegion"
              v-on:region-done-typing="regionDoneTyping"
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
        <v-btn small color="primary" dark
          v-if="user!==null"
          v-on:click="saveData">save</v-btn>
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
import UserService from '../../services/user'
import { setTimeout } from 'timers';
import uuid from 'uuid/v1'
import {ulid} from 'ulid'

window.uuid = uuid
window.ulid = ulid

let pusher
let channel
let regionHashes = {}
const localUuid = uuid()
const cursorColor = '#' + Math.floor(Math.random()*16777215).toString(16)
let inboundRegion = null

export default {
  async mounted() {
    try {
      this.user = await UserService.getUser()
    } catch (error) {
      console.warn(error)
      this.user = null
    }

    this.transcriptionId = this.$route.params.id
    const docId = this.transcriptionId.split(':')[1]

    channel = this.$pusher.subscribe(`presence-transcribe-${EnvService.getEnvironmentName()}-${docId}`)
    // channel.bind('pusher:subscription_succeeded', (members) => {
    //   this.members = members
    //   // for example
    //   // update_member_count(members.count);

    //   // members.each(function(member) {
    //   //   // for example:
    //   //   add_member(member.id, member.info);
    //   // });
    // })

    // channel.bind('client-region-delta', (data) => {
    //   this.$refs[data.name][0].insertDelta(data.delta)
    // })
    // channel.bind('client-region-create', (data) => {
    //   this.regions.push(data)
    // })
    // channel.bind('client-region-update', (data) => {
    //   const targetRegion = this.regions.filter(needle => needle.id === data.id)
    //   if (targetRegion.length) {
    //     targetRegion[0].start = data.start
    //     targetRegion[0].end = data.end
    //   }
    //   this.$refs.player.renderRegions()
    // })
    // channel.bind('client-region-cursor', (data) => {
    //   // console.log(`new cursor for ${data.username}, ${data.index}, ${data.regionId}`)
    //   this.$refs[data.regionId][0].setCursor(data)
    // })

    // TODO: remove this, just for debugging
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
      inboundRegion: null,
      inRegions: [],
      title: '',
      authorId: null,
      saved: false,
      members: [],
      user: null
    }
  },
  // watch: {
  //   members () {
  //     console.log('members changed')
  //     console.log(this.members)
  //   },
  //   regions () {
  //     console.log('regions changed')
  //   }
  // },
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
    regionCursor (data) {
      channel.trigger('client-region-cursor', {
        ...data,
        username: this.username,
        color: cursorColor
      })
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
        regions[index].text = regionText
      }

      const result = await TranscriptionService.saveTranscription(this.authorId, {
        title: this.title,
        source: this.audioFile,
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
    async load () {
      console.log('loaded!')
      const data = await TranscriptionService.getTranscription(this.transcriptionId)
      this.audioFile = data.source
      this.regions = data.regions
      this.title = data.title
      this.authorId = data.authorId
      this.inboundRegion = this.$route.hash.replace('#', '') || null
    },
    /**
     * Iterate over the current regions, pull the sha() from each one and
     * keep a record.
     */
    // you are here, how do we consistenly fire this 
    async setRegionHashes () {
      console.log('set hashes')
      let regions = this.regions
      for (let index in regions) {
        const regionId = regions[index].id
        const regionHash = this.$refs[regionId][0].sha()
        this.regionHashes[regionId] = regionHash
      }
      console.log('hashes')
      console.log(this.regionHashes)
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
    updateRegion (region) {
      const regionIds = this.regions.map(item => item.id)
      if (regionIds.indexOf(region.id) === -1) {
        const regionData = {
          start: region.start,
          end: region.end,
          id: region.id,
          text: []
        }
        channel.trigger('client-region-create', regionData)
        this.regions.push(regionData)
      } else {
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