<template>    

  <div>
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div class="loading" v-if="loading">
      Loading...
    </div>
    
    <v-data-table
        :headers="headers"
        :items="words"
        class="elevation-1"
      >
      <template v-slot:items="props">
        <td>{{ props.item.roman }}</td>
        <td>{{ props.item.derivation }}</td>
        <td>{{ props.item.definition }}</td>
        <td>{{ props.item.type }}</td>
      </template>
    </v-data-table>
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
      words: [],
      headers: [
          {
            text: 'AD',
            align: 'left',
            sortable: false,
            value: 'roman',
            width: '10%'
          },
          { text: 'Derivation', value: 'derivation', width: '20%' },
          { text: 'Definition', value: 'definition', width: '60%' },
          { text: 'Type', value: 'type', width: '10%' },
        ]
    }
  },
  created () {
    this.getUnverified()
  },
  methods: {
    async getUnverified () {
      this.error = null
      this.words = []
      this.loading = true
      try {
        this.words = await corpus.getUnverified()
        this.loading = false
      } catch (error) {
        this.error = error
        this.loading = false
      }
    }
  }
}
</script>