<template>
  <v-container>
    <v-layout>
      <v-flex xs12 class="list-container">
        <h2 class="main-title">Transcriptions</h2>
        <v-data-table
          class="elevation-1"
          :headers="headers"
          :items="list"
          :items-per-page="15"
          :loading="loading"
          ref="table"
        >
          <template v-slot:item.title="{ item }">
            <a :href="item.url">{{ item.title }}</a>
          </template>

          <template v-slot:item.coverage="{ item }">
            <v-progress-linear v-bind:value="item.coverage" height="3"></v-progress-linear>
          </template>

          <template v-slot:item.issues="{ item }">
            <!-- <span :class="{ issues: item.issues > 0 }">{{ item.issues }}</span> -->
            <v-badge v-if="item.issues > 0" color="red" inline :content="item.issues"></v-badge>
            <v-badge v-if="item.issues == 0" color="blue" inline content="0"></v-badge>
          </template>

          <template v-slot:item.dateLastUpdated="{ item }"
            >{{ timeAgo(item.dateLastUpdated) }} by {{ item.userLastUpdated }}</template
          >

          <template v-slot:item.source="{ item }">
            <a :href="item.source" _target="blank">Source</a>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>

    <v-layout class="add-transcription-controls">
      <v-flex xs12>
        <v-btn color="primary" outlined href="/transcribe-add/">
          <v-icon left>mdi-plus</v-icon>Add new
        </v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import TranscriptionService from '../../services/transcriptions'
import UserService from '../../services/user'

import en from 'javascript-time-ago/locale/en'
import TimeAgo from 'javascript-time-ago'
TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

export default {
  mounted() {
    this.loadTranscriptionList()
    // this is a hack, fix it
    // this.$refs.table.defaultPagination.rowsPerPage = 25
    window.list = this
  },
  data() {
    return {
      list: [],
      loading: true,
      headers: [
        { text: 'Title', value: 'title', width: '40%' },
        { text: 'Length', value: 'length' },
        { text: 'Coverage', value: 'coverage', width: '5%' },
        { text: 'Issues', value: 'issues', width: '5%' },
        { text: 'Last edit', value: 'dateLastUpdated' },
        { text: 'Type', value: 'type' },
        { text: 'Source', value: 'source' }
      ]
    }
  },
  methods: {
    /**
     * Load a list of transcriptions.
     */
    async loadTranscriptionList() {
      const currentUser = await UserService.getUser()
      this.list = await TranscriptionService.listTranscriptions(currentUser.name)
      console.log(this.list)
      this.loading = false
    },
    timeAgo(date) {
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
  padding: 15px;
}
.issues {
  color: red;
  font-weight: bold;
}
</style>
