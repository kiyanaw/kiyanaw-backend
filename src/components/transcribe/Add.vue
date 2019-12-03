<template>
  <v-container>
    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10 elevation-1 class="add-container">
        <h2>Upload audio</h2>
          <v-text-field
            label="Title"
            solo
            v-model="title">
          </v-text-field>

          <label>
            Select a file: 
            <input type="file"
              id="file"
              ref="fileInput"
              class="custom-file-input" 
              @change="previewFiles">
          </label>
          <br/>
          <br/>
          <v-btn small
            v-on:click="uploadFile"
            v-bind:disabled="disableUpload || loading">
            Upload
          </v-btn>
          {{ disableUpload }}
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="purple"
          ></v-progress-circular>
      </v-flex>
      <v-flex xs1></v-flex>
    </v-layout>
  </v-container>
</template>

<script>

import TranscriptionService from '../../services/transcriptions'

export default {
  methods: {
    async uploadFile() {
      this.loading = true
      const result = await TranscriptionService.createTranscription({
        file: this.inputFile,
        title: this.title,
      })
      if (result) {
        this.$router.push({path: `/transcribe-edit/${result.author}:${result.id}`})
      }
    },
    previewFiles(evt) {
      this.inputFile = this.$refs.fileInput.files[0]
    },
  },
  computed: {
    disableUpload () {
      return this.inputFile === null || (this.title === null || this.title === '')
    }
  },
  data () {
    return {
      loading: false,
      options: {},
      inputFile: null,
      title: null
    }
  }
}
</script>

<style>
.add-container {
  margin-top:30px;
  padding: 15px;
}
</style>