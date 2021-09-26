<template>
  <v-dialog v-model="lookup" persistent scrollable max-width="600px">
    <v-card>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                label="Press <enter> to search..."
                ref="lookup"
                v-model="search"
                @change="onLookup"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>

        <v-subheader v-if="!results.length">No results</v-subheader>

        <v-card v-for="item in results" v-bind:key="item.title">
          <v-card-title
            >{{ item.wordform_text }} ({{ item.lemma_wordform.wordclass }})</v-card-title
          >
          <v-card-subtitle>{{ item.lemma_wordform.smushedAnalysis }}</v-card-subtitle>
          <v-card-text>
            <div v-for="def in item.lemma_wordform.definitions" v-bind:key="def.text">
              -> {{ def.text }}
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="onClose"> Close </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import Lexicon from '@/services/lexicon'

export default {
  props: ['lookup'],
  watch: {
    lookup: {
      immediate: true,
      handler(newValue) {
        if (newValue) {
          setTimeout(() => {
            console.log(this.$refs.lookup)
            this.$refs.lookup.focus()
          }, 20)
        }
      },
    },
  },
  data() {
    return {
      search: '',
      results: [],
    }
  },
  methods: {
    onClose() {
      this.$emit('close')
    },
    onLookup() {
      Lexicon.lookup(this.search).then((results) => {
        this.results = results
      })
    },
  },
}
</script>
