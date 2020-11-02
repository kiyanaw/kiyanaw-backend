<template>
  <v-container>
    <v-layout>
      <v-flex xs1 />
      <v-flex
        xs10
        elevation-1
        class="add-container"
      >
        <h2>Upload media</h2>
        <v-text-field
          v-model="title"
          label="Title"
          solo
        />

        <label>
          Select an MP3 or MP4 file:
          <input
            id="file"
            ref="fileInput"
            type="file"
            accept=".mp3, .mp4"
            class="custom-file-input"
            @change="previewFiles"
          >
        </label>
        <br>
        <br>
        <v-btn
          small
          :disabled="disableUpload || loading"
          @click="uploadFile"
        >
          Upload
        </v-btn>
        <v-progress-circular
          v-if="loading"
          :value="progress"
          color="purple"
        />
      </v-flex>
      <v-flex xs1 />
    </v-layout>
  </v-container>
</template>

<script>
import TranscriptionService from '../../services/transcriptions'

export default {
  data() {
    return {
      loading: false,
      options: {},
      inputFile: null,
      title: null,
      progress: 0
    }
  },
  computed: {
    disableUpload() {
      return this.inputFile === null || this.title === null || this.title === ''
    }
  },
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
  }
}
</script>

<style>
.add-container {
  margin-top: 30px;
  padding: 15px;
}
</style>
