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
        <div class="text-h4 pt-6">About kiyânaw Transcribe</div>
        <v-row>
          <v-col>
            <p>
              As Indigenous language learners we recognize transcription as a helpful tool in
              building vocabulary and comprehension. Unfortunately the existing tooling for
              authoring transcriptions is fairly limited, not available on all platforms, and not
              collaborative.
            </p>

            <p>
              kiyânaw Transcribe attempts to solve this problem with a web-based tool that supports
              all modern browsers (including mobile), and allows users to collaborate in real-time
              on a transcription.
            </p>

            <p>
              But it can also be helpful to browse and find specific words and forms that you are
              currently studying and see them used in context. The <a href="/stats">stats</a> of
              this app is just that: a collection of surface forms that link back to their sources,
              allowing the user to hear the original form by the original speaker.
            </p>

            <div class="text-h6">License</div>

            <p>
              This project is
              <a href="https://github.com/kiyanaw" target="_blank">open source</a> and not currently
              funded. All media, transcriptions, and data collected are copyright the respective
              owners and may be used for non-commercial, Indigenous language learning purposes only.
              All other use is prohibited unless explicitly granted. All language and language
              recordings are property of their respective nations and may not be used for any
              purpose unless explicitly granted.
            </p>

            <div class="text-h6">Contact</div>
            <p>
              If you have questions or concerns about any of the content on this site, or just want
              to connect feel free to
              <a href="https://m.me/115148727058478" target="_blank">contact me</a>.
            </p>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data: () => ({
    links: [
      { title: 'Transcriptions', link: '/transcribe-list' },
      { title: 'Stats', link: '/stats' },
      { title: 'About', link: '/about' },
    ],
  }),

  mounted() {},
}
</script>

<style scoped>
.v-toolbar__content .theme--light.v-btn {
  color: #d1e0ee !important;
  text-transform: uppercase;
  font-weight: bold;
}
</style>
