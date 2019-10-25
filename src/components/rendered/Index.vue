<template>
  <v-container class="inflected-container">
    <v-layout row>
      <v-flex xs2></v-flex>
      <v-flex xs8>
        <div class="inflected">

          <v-layout row class="inflected-header">
            <v-flex xs12>
              <h1>{{ word.inflected }}</h1>
              <h1><span v-if="word.alternate" class="alternate">{{ word.alternate }}</span></h1>
            </v-flex>
          </v-layout>

          <v-layout row class="inflected-details inflection-translation">
            <v-flex xs5 class="inflected-details-header"><h4>Translation</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">"<em>{{ word.translation }}"</em></v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Participants</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.actor }}<span v-if="word.goal"> → {{ word.goal }}</span></v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Lemma</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">
              <a href="https://altlab.ualberta.ca/itwewina/detail/crk/eng/nêhiyawêw.html" target="_blank">{{ word.lemma.sro }}</a>
            </v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Language</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.language }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Dialect</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.dialect }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Type</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.type }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Transitivity</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.transitivity }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Animacy</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.animacy }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Mode</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.mode }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-details">
            <v-flex xs5 class="inflected-details-header"><h4>Tempus</h4></v-flex>
            <v-flex xs7 class="inflected-details-value">{{ word.tempus }}</v-flex>
          </v-layout>

          <v-layout row class="inflected-notes">
            <v-container grid-list-xl>
              <v-flex>
                <h3>Form notes:</h3>
              </v-flex>
              <v-flex >
               <h4>{{ word.form.name }} <span>"{{ word.form.translation }}"</span></h4>
              </v-flex>
              <v-flex>
                <p>{{ word.form.notes }}</p>
              </v-flex>
            </v-container>
          </v-layout>

          <v-layout class="inflected-examples">
            <v-container grid-list-xl>
              <v-flex>
                <h3>Examples</h3>
              </v-flex>
              <v-flex v-for="item in word.examples"
                v-bind:key="item.title">
                <a v-bind:href="item.link">{{ item.title }}</a>
                <p class="example-text"><em>"{{ item.text }}"</em></p>
              </v-flex>
            </v-container>
          </v-layout>

        </div>
      </v-flex>
      <v-flex xs2></v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { sro2syllabics } from 'cree-sro-syllabics'

window.sro2syllabics = sro2syllabics

// TODO: fix me
window.addEventListener("load", function(event) {
  // If I set the color in the style sheet, it affects every component :S
  document.body.style.backgroundColor = '#abe4ff'
});

// TODO: we may want details about the source of the word, AW or 'user'
// so we can keep track of words that are inputted by us
const word = {
  language: 'nêhiyawêwin',
  dialect: 'Southern Plains (Y)',
  inflected: 'kâ-nêhiyawêcik',
  alternate: 'ᑳ ᓀᐦᐃᔭᐍᒋᐠ',
  translation: 'when they speak Cree; those who speak Cree',
  lemma: {
    sro: 'nêhiyawêw',
    translation: 's/he speaks Cree'
  },
  transitivity: 'Intransitive',
  animacy: 'Animate',
  type: 'Verb',
  actor: '3Pl',
  goal: null,
  tempus: 'Past',
  mode: 'Conjunct',
  fstIdentifier: 'PV/kâ+*+Cnj+Prs+3Pl',
  form: {
    name: 'kâ-',
    translation: "when",
    notes: 'kâ- is typically used to imply "when" as in "when I speak", but is also often used in names to imply "one who" as in "one who speaks".'
  },
  examples: [
    {title: 'Doreen Frencheater Daychief Interview (00:21)', link: '/transcribe-edit/admin:54aaaff460d71b2f5eedc6961e198331#wavesurfer_2iqi7l8i4mc', text: 'ê-nôhtê-âcimoyân ôma kîkwây mâna kâ-kî-pê-itwêt kâ-kî-ohkômiyân'}
  ]
}

export default {
  data () {
    return {
      word: word
    }
  }
}

// TODO: styles are broken
// TODO: finish fleshing out this template
</script>

<style>
body {
  font-family: 'Roboto', sans-serif;
}
.inflected {
  background-color: white;
  min-height: 300px;
  border-radius: 10px;
  padding: 20px;
  font-size: 1.4em;
}
.inflected-container {
  margin-top: 30px;
}
.inflected-header {
  margin-bottom: 20px;
  text-align: center;
}
.inflected-details {
  padding: 5px 0;
}
.inflected-details-header {
  text-align: right;
  padding: 0 15px;
  color:#999;
}
.alternate {
  color: #999;
  padding: 0 10px;
  font-weight: normal;
}
.inflected-notes {
  margin-top:20px;
  border-radius: 20px;
  background-color: #eee;
  padding: 20px;
}
.inflected-notes .flex {
  margin: 10px;
}
.inflected-examples {
  padding: 20px;
}
.inflected-examples .flex {
  margin: 10px;
}
.example-text {
  color: #999;
}

</style>