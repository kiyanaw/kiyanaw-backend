<template>
  <v-container>
    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10 class="list-container">
        <h2>Transcriptions</h2>

        <v-layout elevation-1 class="transcription-list">
          <table class="transcription-table">
            <tr>
              <th width="65%">Name</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Source</th>
            </tr>
            <tr v-for="item in list"
              v-bind:key="item.author_ID">
              <td><a v-bind:href="'/transcribe-edit/' + item.authorId">{{ item.title }}</a></td>
              <td>{{ item.author }}</td>
              <td>{{ item.type }}</td>
              <td><a v-bind:href="item.source" _target="blank">Link</a></td>
            </tr>
          </table>
        </v-layout>

        <v-layout class="add-transcription-controls">
          <a href="/transcribe-add/">Add new</a>
        </v-layout>

      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import TranscriptionService from '../../services/transcriptions'
import UserService from '../../services/user'

export default {
  mounted () {
    this.loadTranscriptionList()
    window.list = this
  },
  data () {
    return {
      list: [],
      loading: true
    }
  },
  methods: {
    async loadTranscriptionList () {
      const currentUser = await UserService.getUser()
      this.list = await TranscriptionService.listTranscriptions(currentUser.name)
    }
  }
}
</script>

<style>
.list-container h2 {
  margin: 10px 0;
}
.transcription-list {
  padding: 15px;
}
.transcription-table {
  width: 100%;
}
.transcription-table th { 
  text-align: left;
}
.add-transcription-controls {
  text-align: right;
}
</style>
