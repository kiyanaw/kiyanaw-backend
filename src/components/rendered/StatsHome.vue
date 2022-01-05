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
        <div class="text-h4 pt-6">Index stats</div>
        <p>This section is currently experimental.</p>
        <v-row>
          <v-col>
            <v-sheet min-height="20vh" rounded="lg">
              <v-container>
                <v-row>
                  <v-col>
                    <v-card-title>Word type distribution</v-card-title>
                    <v-simple-table dense>
                      <template v-slot:default>
                        <thead>
                          <tr>
                            <th class="text-left">Type</th>
                            <th class="text-left">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in wordTypeCounts" :key="item.key">
                            <td>{{ item.key }}</td>
                            <td>{{ item.doc_count }}</td>
                          </tr>
                        </tbody>
                      </template>
                    </v-simple-table>
                  </v-col>
                  <v-col>
                    <v-card-title>Most common verbs</v-card-title>
                    <v-simple-table dense>
                      <template v-slot:default>
                        <thead>
                          <tr>
                            <th class="text-left">Lemma</th>
                            <th class="text-left">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in topVerbCounts" :key="item.key">
                            <td>
                              <a :href="'/stats/lemma/' + item.key">
                                {{ item.key }}
                              </a>
                            </td>
                            <td>{{ item.doc_count }}</td>
                          </tr>
                        </tbody>
                      </template>
                    </v-simple-table>
                  </v-col>
                  <v-col>
                    <v-card-title>Most common nouns</v-card-title>
                    <v-simple-table dense>
                      <template v-slot:default>
                        <thead>
                          <tr>
                            <th class="text-left">Lemma</th>
                            <th class="text-left">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in topNounCounts" :key="item.key">
                            <td>
                              <a :href="'/stats/lemma/' + item.key">
                                {{ item.key }}
                              </a>
                            </td>
                            <td>{{ item.doc_count }}</td>
                          </tr>
                        </tbody>
                      </template>
                    </v-simple-table>
                  </v-col>
                </v-row>
              </v-container>
            </v-sheet>
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
    wordTypeCounts: [],
    topVerbCounts: [],
    topNounCounts: [],
  }),

  mounted() {
    lexicon.getWordTypeCount().then((results) => {
      console.log('wordTypes', results)
      this.wordTypeCounts = results
    })
    lexicon.getVerbLemmaCount().then((results) => {
      console.log('Verbs', results)
      this.topVerbCounts = results
    })
    lexicon.getNounLemmaCount().then((results) => {
      console.log('Nouns', results)
      this.topNounCounts = results
    })
    this.$nextTick(() => {
      // TODO: fix this in CSS
      document.body.style.overflow = 'auto'
    })
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
