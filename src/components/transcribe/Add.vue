<template>
  <v-container>
    <v-layout>
      <v-flex xs1></v-flex>
      <v-flex xs10 elevation-1 class="add-container">
        <h2>Upload media</h2>
        <v-text-field label="Title" solo v-model="title"> </v-text-field>

        <label>
          Select an MP3 or MP4 file:
          <input
            type="file"
            id="file"
            accept=".mp3, .mp4"
            ref="fileInput"
            class="custom-file-input"
            @change="previewFiles"
          />
        </label>
        <br />
        <br />
        <v-btn small v-on:click="uploadFile" v-bind:disabled="disableUpload || loading">
          Upload
        </v-btn>
        <v-progress-circular
          v-if="loading"
          v-bind:value="progress"
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
      const result = await TranscriptionService.createTranscription(
        {
          file: this.inputFile,
          title: this.title
        },
        (progress) => {
          this.progress = (progress.loaded / progress.total) * 100
          // console.log(progress)
        }
      )
      if (result) {
        this.$router.push({ path: `/transcribe-edit/${result.id}` })
      }
    },
    previewFiles(evt) {
      this.inputFile = this.$refs.fileInput.files[0]
      console.log(this.inputFile)
    }
  },
  computed: {
    disableUpload() {
      return this.inputFile === null || this.title === null || this.title === ''
    }
  },
  data() {
    return {
      loading: false,
      options: {},
      inputFile: null,
      title: null,
      progress: 0
    }
  }
}
</script>

<style>
.add-container {
  margin-top: 30px;
  padding: 15px;
}
</style>
