<template>
  <v-form ref="form">
    <v-text-field v-model="title" :disabled="disableInputs" label="Title"></v-text-field>
    <v-text-field v-model="comments" :disabled="disableInputs" label="Comments"></v-text-field>
    <v-text-field v-model="lastUpdated" disabled label="Last updated"></v-text-field>
    <v-text-field v-model="regionCount" disabled label="Total regions"></v-text-field>
    <!-- <v-text-field v-model="regionCoverage" disabled label="Region coverage"></v-text-field>
    <v-text-field v-model="issueCount" disabled label="Total issues"></v-text-field> -->
    <!-- <v-text-field v-model="wordCount" disabled label="Word count"></v-text-field>
    <v-text-field v-model="knownWordCount" disabled label="Known word count"></v-text-field> -->
    <v-combobox
      v-model="accessLevel"
      :disabled="disableInputs"
      :items="['Enable', 'Disable']"
      label="Public read access"
    ></v-combobox>
    <v-combobox
      v-model="analyzerEnabled"
      :disabled="disableInputs"
      :items="['Enable', 'Disable']"
      label="Analyzer"
    ></v-combobox>
    <v-combobox
      v-model="currentEditors"
      :items="otherProfiles"
      :disabled="disableInputs"
      label="Editors"
      chips
      hide-selected
      multiple
      deletable-chips
      @change="onEditorChange"
    >
    </v-combobox>
  </v-form>
</template>

<script>
import { DataStore } from 'aws-amplify'
import { mapActions, mapGetters } from 'vuex'
import { Contributor } from '../../models'

// import UserService from '../../services/user'

export default {
  data() {
    return {
      currentEditors: [],
    }
  },
  mounted() {
    this.loadProfiles()
    this.currentEditors = this.editors

    window.api = this
  },
  methods: {
    ...mapActions(['addEditor', 'removeEditor', 'setProfiles']),

    loadProfiles() {
      // UserService.listProfiles().then((results) => {
      //   console.log('profile results', results)
      //   this.setProfiles(results)
      // })
      DataStore.query(Contributor).then((items) => {
        console.log('Got profiles', items)
        this.setProfiles(items)
      })
    },
    
    onEditorChange(value) {
      if (!value.includes(this.author)) {
        // don't delete the owner
        this.currentEditors.unshift(this.author)
      } else {
        if (value.length > this.editors.length) {
          // user was added
          const newEditor = value.filter((item) => !this.editors.includes(item)).pop()
          console.log('add user', newEditor)
          this.addEditor(newEditor)
        } else {
          // user was removed
          const staleEditor = this.editors.filter((item) => !value.includes(item)).pop()
          console.log('remove user', staleEditor)
          this.removeEditor(staleEditor)
        }
      }
    },

    async setAuthor(username) {
      await this.$store.dispatch('updateTranscription', { author: username })
      // TODO: save author here
      // await UserService.addTranscriptionEditor(this.transcription.id, username)
    },
  },
  computed: {
    ...mapGetters(['user', 'profiles', 'transcription']),

    accessLevel: {
      get() {
        if (this.$store.getters.transciption) {
          return this.$store.getters.transciption.isPrivate ? 'Disable' : 'Enable'
        }
        return 'Enable'
      },
      set(value) {
        if (value === 'Disable') {
          this.$store.dispatch('updateTranscription', { isPrivate: true })
        } else {
          this.$store.dispatch('updateTranscription', { isPrivate: false })
        }
      },
    },

    analyzerEnabled: {
      get() {
        return this.$store.getters.transcription.disableAnalyzer ? 'Disable' : 'Enable'
      },
      set(value) {
        if (value === 'Disable') {
          this.$store.dispatch('updateTranscription', { disableAnalyzer: true })
        } else {
          this.$store.dispatch('updateTranscription', { disableAnalyzer: false })
        }
      },
    },

    /**
     * Disable inputs if not AUTHOR
     */
    disableInputs: {
      get() {
        if (this.user) {
          return this.user.name !== this.author
        } else {
          return true
        }
      },
    },
    otherProfiles: {
      get() {
        if (this.user) {
          const username = this.user.name
          return this.profiles
            .filter((item) => item.username !== username)
            .map((item) => item.username)
        }
        return []
      },
    },
    author: {
      get() {
        return this.$store.getters.transcription.author
      },
    },
    editors: {
      get() {
        return this.$store.getters.transcription.editors
      },
    },

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
        return this.$store.getters.regions.length
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
