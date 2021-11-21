<template>
  <v-container>
    <v-layout>
      <v-flex xs12 class="list-container">
        <h2 class="main-title">Transcriptions</h2>
        <v-card-title>
          <v-text-field
            v-model="search"
            append-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
        </v-card-title>
        <v-data-table
          ref="table"
          class="elevation-1"
          :headers="headers"
          :items="transcriptions"
          :items-per-page="10"
          :loading="loading"
          :search="search"
        >
          <template v-slot:item.title="{ item }">
            <a :href="item.url">{{ item.title }}</a>
          </template>

          <template v-slot:item.coverage="{ item }">
            <v-progress-linear :value="item.coverage" height="3" />
          </template>
          <template v-slot:item.issues="{ item }">
            <v-badge v-if="item.issues > 0" color="red" inline :content="item.issues" />
            <v-badge v-if="item.issues == 0" color="blue" inline content="0" />
          </template>

          <template v-slot:item.dateLastUpdated="{ item }">
            {{ timeAgo(item.dateLastUpdated) }} by {{ item.userLastUpdated }}
          </template>

          <template v-slot:item.source="{ item }">
            <a :href="item.source" _target="blank">Source</a>
          </template>
          <!-- d
-->
        </v-data-table>
      </v-flex>
    </v-layout>

    <v-layout class="add-transcription-controls">
      <v-flex xs12>
        <v-btn color="primary" outlined href="/transcribe-add/">
          <v-icon left> mdi-plus </v-icon>Add new
        </v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
// import TranscriptionService from '../../services/transcriptions'

import en from 'javascript-time-ago/locale/en'
import TimeAgo from 'javascript-time-ago'
TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

export default {
  data() {
    return {
      loading: true,
      search: '',
      headers: [
        { text: 'Title', value: 'title', width: '40%' },
        { text: 'Length', value: 'length' },
        { text: 'Coverage', value: 'coverage', width: '5%' },
        { text: 'Issues', value: 'issues', width: '5%' },
        { text: 'Last edit', value: 'dateLastUpdated' },
        { text: 'Type', value: 'type' },
        { text: 'Source', value: 'source' },
      ],
      search: '',
    }
  },
  mounted() {
    this.loadTranscriptions()
    // this is a hack, fix it
    // this.$refs.table.defaultPagination.rowsPerPage = 25
  },
  computed: {
    ...mapGetters(['transcriptions']),
  },
  methods: {
    ...mapActions(['loadTranscriptions']),

    timeAgo(date) {
      return timeAgo.format(new Date(Number(date)))
    },
  },
  watch: {
    transcriptions() {
      this.loading = !this.transcriptions.length
    },
  },
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
