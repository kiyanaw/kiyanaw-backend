<template>
  <v-form ref="form">
    <v-text-field v-model="title" :disabled="!user" label="Title"></v-text-field>
    <v-text-field v-model="comments" :disabled="!user" label="Comments"></v-text-field>
    <v-text-field v-model="lastUpdated" disabled label="Last updated"></v-text-field>
    <v-text-field v-model="regionCount" disabled label="Total regions"></v-text-field>
    <v-text-field v-model="regionCoverage" disabled label="Region coverage"></v-text-field>
    <v-text-field v-model="issueCount" disabled label="Total issues"></v-text-field>
    <v-text-field v-model="wordCount" disabled label="Word count"></v-text-field>
    <v-text-field v-model="knownWordCount" disabled label="Known word count"></v-text-field>
  </v-form>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters(['user']),
    comments: {
      get() {
        return this.$store.getters.transcription.comments
      },
      set(value) {
        this.$store.dispatch('updateTranscription', { comments: value })
      },
    },

    issueCount: {
      get() {
        return this.$store.getters.transcription.issues
      },
    },

    lastUpdated: {
      get() {
        return new Date(Number(this.$store.getters.transcription.dateLastUpdated))
      },
    },

    regionCount: {
      get() {
        return this.$store.getters.transcription.regions.length
      },
    },

    regionCoverage: {
      get() {
        return `${this.$store.getters.transcription.coverage}%`
      },
    },

    title: {
      get() {
        return this.$store.getters.transcription.title
      },
      set(value) {
        this.$store.dispatch('updateTranscription', { title: value })
      },
    },

    knownWordCount: {
      get() {
        return 'TODO'
      },
    },

    wordCount: {
      get() {
        return 'TODO'
      },
    },
  },
}
</script>
