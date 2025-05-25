<template>
  <v-app id="inspire">
    <v-app-bar app color="#305880" flat>
      <v-container class="py-0 fill-height">
        <v-avatar class="mr-10" color="grey darken-1" size="32">
          <img alt="Avatar" src="https://avatars.githubusercontent.com/u/42557359?s=200&v=4" />
        </v-avatar>

        <v-btn v-for="link in links" :key="link.title" :href="link.link" text>
          {{ link.title }}
        </v-btn>

        <v-spacer></v-spacer>

        <v-responsive max-width="260">
          <v-text-field dense flat hide-details rounded></v-text-field>
        </v-responsive>
      </v-container>
    </v-app-bar>

    <v-main class="grey lighten-3">
      <v-container class="mb-6">
        <div class="text-h3 pt-6">{{ lemma }}</div>
        <v-row>
          <v-col>
            <v-container>
              <v-card>
                <div v-for="(result, index) in itwewinaResults" :key="index">
                  <v-card-title>Result from itwêwina: {{ result.wordform_text }}</v-card-title>
                  <v-card-subtitle
                    >{{ result.lemma_wordform.inflectional_category }} -
                    {{ result.lemma_wordform.inflectional_category_linguistic }}</v-card-subtitle
                  >
                  <v-card-text>
                    <ul>
                      <li v-for="(definition, dindex) in result.definitions" :key="dindex">
                        {{ definition.text }} (
                        <span v-for="(sourceId, sindex) in definition.source_ids" :key="sindex">
                          {{ sourceId }}
                        </span>
                        )
                      </li>
                    </ul>
                  </v-card-text>
                </div>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    text
                    :href="'https://itwewina.altlab.app/word/' + lemma + '/'"
                    target="_blank"
                  >
                    <v-icon left>mdi-open-in-new</v-icon>View {{ lemma }} on itwêwina</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-container>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-card-title class="pl-0">Surface form distribution for {{ lemma }}</v-card-title>
            <v-card-subtitle class="pl-0">Select a form below to see occurrences</v-card-subtitle>
            <v-data-table
              dense
              :headers="[
                { text: 'Surface form', value: 'key' },
                { text: 'Count', value: 'doc_count' },
              ]"
              :items="surfaceCounts"
              :items-per-page="10"
              @click:row="surfaceClicked"
              item-key="key"
              class="elevation-1"
            >
            </v-data-table>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-card-title class="pl-0"
              >Surface form occurrences for {{ currentSurfaceForm }}</v-card-title
            >

            <v-simple-table dense>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th class="text-left">Source</th>
                    <th class="text-left">Text</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in surfaceOccurrences" :key="index">
                    <td>
                      <a
                        :href="
                          'https://transcribe.kiyanaw.net/transcribe-edit/' +
                          item.transcriptionId +
                          '/' +
                          item.regionId
                        "
                        target="_blank"
                      >
                        {{ item.transcriptionName }}
                      </a>
                    </td>
                    <td v-html="highlightSurfaceForm(item.regionText, currentSurfaceForm)"></td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import lexicon from '../../services/lexicon'
export default {
  data: () => ({
    links: [
      { title: 'Transcriptions', link: '/transcribe-list' },
      { title: 'Stats', link: '/stats' },
      { title: 'About', link: '/about' },
    ],
    itwewinaResults: [],
    surfaceCounts: [],
    currentSurfaceForm: null,
    surfaceOccurrences: [],
    lemma: null,
  }),

  mounted() {
    this.lemma = this.$route.params.word

    lexicon.lookup(this.lemma).then((itwewinaResults) => {
      console.log('itw', itwewinaResults)
      this.itwewinaResults = [itwewinaResults[0]]
    })

    lexicon.getSurfaceCount(this.lemma).then((surfaceCounts) => {
      console.log('surface counts', surfaceCounts)
      this.surfaceCounts = surfaceCounts
      if (surfaceCounts && surfaceCounts.length) {
        this.currentSurfaceForm = surfaceCounts[0].key
      }
    })

    this.$nextTick(() => {
      // TODO: fix this in CSS
      document.body.style.overflow = 'auto'
    })
  },

  methods: {
    surfaceClicked(row) {
      this.currentSurfaceForm = row.key
    },

    highlightSurfaceForm(sentence, surfaceForm) {
      return sentence.replace(surfaceForm, `<strong>${surfaceForm}</strong>`)
    },

    // fixTimestamp(input) {
    //   input = input
    //     .split(':')
    //     .map((part) => Number(part).toFixed(2))
    //     .join(':')
    //   return input
    // },
  },

  watch: {
    currentSurfaceForm(newValue) {
      console.log('Surface form selected', newValue)
      if (newValue) {
        lexicon.getSurfaceOccurance(newValue).then((results) => {
          this.surfaceOccurrences = results
          console.log('surface', results)
        })
      }
    },
  },
}
</script>

<style scoped>
.v-toolbar__content .theme--light.v-btn {
  color: #d1e0ee !important;
  text-transform: uppercase;
  font-weight: bold;
}
</style>
