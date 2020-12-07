<template>
  <div class="stationary-editor">
    <v-tabs v-model="activeTab" :height="35">
      <v-tab :key="0"> <v-icon left small> mdi-information-outline </v-icon>Transcription</v-tab>
      <v-tab :key="1"> <v-icon left small> mdi-pencil-box </v-icon>Region #{{ regionIndex }}</v-tab>
      <v-tab :key="2"> <v-icon left small> mdi-flag-outline </v-icon>Issues</v-tab>

      <v-tab-item :transition="false" :reverse-transition="false" class="tab-panel">
        <transcription-form></transcription-form>
      </v-tab-item>

      <v-tab-item :transition="false" :reverse-transition="false" class="tab-panel">
        <region-form @create-issue="activeTab = 2"></region-form>
      </v-tab-item>

      <v-tab-item :transition="false" :reverse-transition="false" class="tab-panel">
        <issues-form></issues-form>
      </v-tab-item>
    </v-tabs>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import TranscriptionForm from './TranscriptionForm.vue'
import RegionForm from './RegionForm.vue'
import IssuesForm from './IssuesForm.vue'

const tabs = {
  Transcription: 0,
  Region: 1,
  Issues: 2,
}

export default {
  components: { IssuesForm, RegionForm, TranscriptionForm },

  computed: {
    ...mapGetters(['selectedRegion', 'selectedIssue']),

    regionIndex() {
      return this.selectedRegion ? this.selectedRegion.index : ''
    },
  },

  data: function () {
    return {
      activeTab: tabs.Transcription,
    }
  },

  methods: {
    ...mapActions(['setSelectedIssue']),

    // onNewIssue(issue) {

    // },
  },

  watch: {
    activeTab(newValue) {
      if (this.selectedIssue && !this.selectedIssue.id && newValue !== tabs.Issues) {
        if (confirm('Discard new issue?')) {
          this.setSelectedIssue(null)
        } else {
          console.log('go back to issues tab')
          this.$nextTick(() => {
            this.activeTab = tabs.Issues
          })
        }
      }
    },

    selectedRegion(newRegion) {
      if (newRegion) {
        this.activeTab = tabs.Region
      }
    },
  },

  mounted() {
    if (this.selectedRegion) {
      this.activeTab = tabs.Region
    }
  },
}
</script>

<style scoped>
.tab-panel {
  padding: 15px;
}
</style>
