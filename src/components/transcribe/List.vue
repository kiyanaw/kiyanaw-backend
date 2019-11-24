<template>
  <v-container>
    <v-layout>
      <v-flex xs12 class="list-container">
        <h2 class="main-title">Transcriptions</h2>
        <v-data-table
            class="elevation-1"
            :headers="headers"
            :items="list"
            :loading="loading"
            ref="table">
          <template v-slot:items="props">
            <td><a v-bind:href="props.item.url">{{ props.item.title }}</a></td>
            <td>{{ props.item.length }}</td>
            <td>
              <v-progress-linear
                v-bind:value="props.item.coverage"
                height="3">
              </v-progress-linear>
            </td>
            <td>{{ timeAgo(props.item.dateLastUpdated) }} {{ props.item.lastUpdateBy }}</td>
            <td>{{ props.item.type }}</td>
            <td><a v-bind:href="props.item.source" _target="blank">Link</a></td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>

    <v-layout class="add-transcription-controls">
      <a href="/transcribe-add/">Add new</a>
    </v-layout>
  </v-container>
</template>

<script>

import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en' 
import TranscriptionService from '../../services/transcriptions'
import UserService from '../../services/user'
import utils from './utils'

TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

window.timeAgo = timeAgo

/**
 * Wraps the incoming transcription data to provide a consistent API.
 */
class Transcription {
  constructor (data) {
    console.log(data) 
    this.data = data
    this.authorId = data.authorId
    this.title = data.title
    this.author = data.author
    this.type = data.type
    this.source = data.source
    this.coverage = data.coverage || '?'
    this.dateLastUpdated = new Date(data.dateLastUpdated)
    this.lastUpdateBy = data.lastUpdateBy
  }
  /**
   * Provide the URL to edit the transcription.
   * @returns {string}
   */
  get url () { return '/transcribe-edit/' + this.data.authorId }
  /**
   * Provide the length of the transcription audio in MM:SS
   * @returns {string}
   */
  get length () { return String(utils.floatToMSM(this.data.length)).split('.')[0] }
}

export default {
  mounted () {
    this.loadTranscriptionList()
    // this is a hack, fix it
    this.$refs.table.defaultPagination.rowsPerPage = 25
    window.list = this
  },
  data () {
    return {
      list: [],
      loading: true,
      headers: [
        { text: 'Title', value: 'title', width: '40%'},
        { text: 'Length', value: 'length'},
        { text: 'Coverage', value: 'coverage', width: '5%'},
        { text: 'Last edit', value: 'dateLastUpdated'},
        { text: 'Type', value: 'type'},
        { text: 'Source', value: 'source'},
      ]
    }
  },
  methods: {
    /**
     * Load a list of transcriptions.
     */
    async loadTranscriptionList () {
      const currentUser = await UserService.getUser()
      this.list = (await TranscriptionService.listTranscriptions(currentUser.name))
        .map(x => new Transcription(x))
      this.loading = false
    },
    timeAgo (date) {
      return timeAgo.format(date)
    }
  }
}
</script>

<style>
.list-container h2 {
  margin: 10px 0;
}
.add-transcription-controls {
  text-align: right;
}
</style>
