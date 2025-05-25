<template>
  <v-container>
    <v-layout>
      <v-flex xs1 />
      <v-flex xs10 elevation-1 class="add-container">
        <h2>Upload media</h2>
        <v-text-field v-model="title" label="Title" solo />

        <label>
          Select an MP3 or MP4 file:
          <input
            id="file"
            ref="fileInput"
            type="file"
            accept=".mp3, .mp4"
            class="custom-file-input"
            @change="previewFiles"
          />
        </label>
        <br />
        <br />
        <v-btn small :disabled="disableUpload || loading" @click="uploadFile"> Upload </v-btn>
        <v-progress-circular v-if="loading" :value="progress" color="purple" />
      </v-flex>
      <v-flex xs1 />
    </v-layout>
  </v-container>
</template>

<script>
import UUID from 'uuid'
import TranscriptionService from '../../services/transcriptions'
import EnvService from '../../services/env'
import UserService from '../../services/user'

import { DataStore } from '@aws-amplify/datastore'
import { Contributor, Transcription, TranscriptionContributor } from '../../models'

export default {
  data() {
    return {
      loading: false,
      options: {},
      inputFile: null,
      title: null,
      progress: 0,
    }
  },
  computed: {
    disableUpload() {
      return this.inputFile === null || this.title === null || this.title === ''
    },
  },
  methods: {
    async uploadFile() {
      this.loading = true
      // const result = await TranscriptionService.createTranscription(
      //   {
      //     file: this.inputFile,
      //     title: this.title,
      //   },
      //   (progress) => {
      //     this.progress = (progress.loaded / progress.total) * 100
      //   },
      // )
      const fileResult = await TranscriptionService.uploadMediaFile(this.inputFile,
        (progress) => {
          this.progress = (progress.loaded / progress.total) * 100
        },
      )

      const key = fileResult.key
      const bucket = EnvService.getUserBucket()
      const source = `https://${bucket}.s3.amazonaws.com/public/${key}`
      const user = await UserService.getUser()
      const id = UUID.v1().split('-')[0]
      const transcription = await DataStore.save(
        new Transcription({
          id: id,
          title: this.title,
          source,
          type: this.inputFile.type,
          dateLastUpdated: `${+ new Date()}`,
          author: user.name,
          userLastUpdated: user.name,
          issues: '',
          length: 0,
          coverage: 0,
          disableAnalyzer: false,
          isPrivate: false,
        })
      )
      console.log('transcription uploaded', transcription)

      const contributor = await DataStore.query(Contributor, user.name)

      const link = await DataStore.save(
        new TranscriptionContributor({
          transcription,
          contributor,
        }),
      )
      console.log('owner added to transcription', link)


      if (link) {
        this.$router.push({ path: `/transcribe-edit/${transcription.id}` })
      }
    },
    previewFiles() {
      this.inputFile = this.$refs.fileInput.files[0]
    },
  },
}
</script>

<style>
.add-container {
  margin-top: 30px;
  padding: 15px;
}
</style>
