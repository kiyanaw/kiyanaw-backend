<template>    
  <div>

    <v-toolbar flat>
      <v-container class="tools">
          <v-text-field
            label="Search"
            prepend-icon="search"
            v-model="searchValue"
          ></v-text-field>
      </v-container>
    </v-toolbar>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <v-data-table
        class="elevation-1"
        :headers="headers"
        :items="words"
        :loading="loading"
        :pagination.sync="pagination"
        :rows-per-page-items="pagination.rowsPerPageItems"
        :total-items="pagination.totalItems">
      <template v-slot:items="props">
        <td><a v-on:click="editWord" v-bind:id="props.item._id">{{ props.item.roman }}</a></td>
        <td>{{ props.item.derivation }}</td>
        <td>{{ props.item.definition }}</td>
        <td>{{ props.item.type }}</td>
      </template>
    </v-data-table>

  </div>
</template>

<script>
import corpus from '../../services/corpus.js'

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
          width: '20%'
        },
        { text: 'Derivation', value: 'derivation', width: '20%' },
        { text: 'Definition', value: 'definition', width: '60%' },
        { text: 'Type', value: 'type', width: '10%' },
      ],
      pagination: { rowsPerPage: 10, page: 1, totalItems: 1000, sortBy: 'roman', descending: true},
      searchValue: ''
    }
  },
  created () {
    this.getUnverified()
  },
  watch: {
    pagination: {
      handler () {
        this.loading = true
        this.getUnverified(this.pagination.page)
          .then(_result => {
            this.loading = false
          })
      },
      deep: true
    },
    searchValue: {
      handler () {
        this.loading = true
        this.getUnverified(this.pagination.page)
          .then(_result => {
            this.loading = false
          })
      }
    }
  },
  methods: {
    // data binding from https://codepen.io/paulpv/pen/zWPKao
    async getUnverified () {
      this.error = null
      this.loading = true
      try {
        const pageSize = this.pagination.pageSize || 10
        const from = (this.pagination.page * pageSize) - pageSize
        const pageParam = {from: from, size: pageSize}
        const {words, total} = await corpus.getUnverified(pageParam, this.searchValue)
        this.words = words
        this.pagination.totalItems = total
        this.loading = false
      } catch (error) {
        this.error = error
        this.loading = false
      }
    },
    editWord (event) {
      const id = event.target.id
      this.$router.push(`/edit/${id}`)
    }
  }
}
</script>

<style>
.tools {
  margin-top:10px
}
</style>
