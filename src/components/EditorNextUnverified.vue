<template>    

  <div class="morpheme-editor">
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div class="loading" v-if="loading">
      Loading...
    </div>

    <div v-if="word">
      <h1>{{ word.roman }}</h1>
      <p>{{ word.definition }}</p>

      <v-spacer></v-spacer>

      <h2>derivation</h2>
      <p>
        <span v-for="morpheme in word.derivation">
          <a>{{ morpheme }}</a>&nbsp;
        </span>
      </p>
      <!-- <ul>
        <li v-for="morpheme in word.derivation">
          <a>{{ morpheme }} [-]</a>
        </li>
        <li><v-btn flat color="primary">[+] Add</v-btn></li>
      </ul> -->

    </div>
  </div>

</template>

<script>
import corpus from '../services/corpus.js'
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
    this.getNextUnverified()
  },
  methods: {
    async getNextUnverified () {
      this.error = null
      this.word = null
      this.loading = true
      try {
        this.word = await corpus.getNextUnverified()
        this.loading = false
      } catch (error) {
        this.error = error
        this.loading = false
      }
    }
  }
}
</script>

<style>
.morpheme-editor {
  padding: 20px;
}
</style>