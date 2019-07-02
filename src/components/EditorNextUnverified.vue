<template>    

  <v-layout row>
    <v-flex xs6>
      <div class="morpheme-editor">
        <div v-if="error" class="error">
          {{ error }}
        </div>

        <div class="loading" v-if="loading">
          Loading...
        </div>

        <div v-if="word">
          <h1>Edit word</h1>
          <v-text-field v-model="word.roman" label="SRO"></v-text-field>
          <v-text-field v-model="word.definition" label="Description"></v-text-field>

          <v-spacer></v-spacer>

          <h2>derivation</h2>
          <p>
            <span v-for="morpheme in word.derivation">
              <a>{{ morpheme }}</a>&nbsp;
            </span>
          </p>

        </div>
        <v-textarea label="Comments"></v-textarea>
        <v-btn color="success">Save</v-btn><v-btn>Cancel</v-btn>
      </div>

    </v-flex>
    <v-flex xs6>
      <morpheme-search></morpheme-search>

    </v-flex>
  </v-layout>
</template>

<script>
import corpus from '../services/corpus.js'
import MorphemeSearch from './MorphemeSearch'

export default {
  // https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-after-navigation
  data () {
    return {
      loading: false,
      error: null,
      word: null
    }
  },
  created () {
    const id = this.$route.params.id
    this.getNextUnverified(id)
  },
  methods: {
    async getNextUnverified (id=null) {
      this.error = null
      this.word = null
      this.loading = true
      try {
        this.word = await corpus.getNextUnverified(id)
        this.loading = false
      } catch (error) {
        this.error = error
        this.loading = false
      }
    }
  },
  components: {
    MorphemeSearch
  }
}
</script>

<style>
.morpheme-editor {
  padding: 20px;
}
</style>