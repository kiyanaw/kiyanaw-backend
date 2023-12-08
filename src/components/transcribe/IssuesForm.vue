<template>
  <div class="region-issue-form">
    <v-layout v-if="!selectedIssue && issues">
      <v-list width="100%" three-line>
        <template v-for="(issue, index) in issues">
          <v-list-item :key="issue.id" @click="setSelectedIssue(issue)" class="region-issue-item">
            <template v-slot:default="{ active }">
              <v-list-item-content>
                <v-list-item-title v-text="issue.text"></v-list-item-title>

                <v-list-item-subtitle
                  class="text--primary"
                  v-text="issue.owner"
                ></v-list-item-subtitle>

                <v-list-item-subtitle v-text="issue.comments.length + ' comment(s)'">
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action>
                <v-list-item-action-text
                  v-text="timeAgo(new Date(Number(issue.createdAt)))"
                ></v-list-item-action-text>

                <div class="region-issue-type-icon">
                  <v-icon v-if="!issue.resolved" :color="issueColor(issue.type)">
                    mdi-alert-circle
                  </v-icon>
                  <v-icon v-if="issue.resolved" color="green"> mdi-checkbox-marked-circle </v-icon>
                </div>
              </v-list-item-action>
            </template>
          </v-list-item>

          <v-divider :key="index"></v-divider>
        </template>
      </v-list>
    </v-layout>

    <!-- Issue details -->
    <v-layout v-if="selectedIssue && selectedIssue.id">
      <v-list width="100%">
        <v-subheader>
          <a @click="setSelectedIssue(null)">&larr; Back to issues</a>
        </v-subheader>
        <v-list-item>
          <v-list-item-avatar>
            <v-icon v-if="!selectedIssue.resolved" color="error" large> mdi-alert-circle </v-icon>
            <v-icon v-if="selectedIssue.resolved" color="success" large> mdi-check-circle </v-icon>
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title>
              <span :class="'issue-' + selectedIssue.issueType">{{ selectedIssue.text }}</span>
            </v-list-item-title>
            <v-list-item-subtitle>
              <v-chip small>
                {{ selectedIssue.type }}
              </v-chip>
              {{ timeAgo(new Date(Number(selectedIssue.createdAt))) }} by
              {{ selectedIssue.owner }} (index: {{ selectedIssue.index }})
            </v-list-item-subtitle>
          </v-list-item-content>

          <v-list-item-action>
            <v-btn
              class="ma-2"
              rounded
              small
              outlined
              :disabled="disableInputs"
              :color="selectedIssue.resolved ? 'error' : 'success'"
              @click="onResolveIssue"
            >
              <v-icon v-if="!selectedIssue.resolved" left> mdi-checkbox-marked-circle </v-icon>
              <span v-if="!selectedIssue.resolved">Resolve</span>

              <v-icon v-if="selectedIssue.resolved" left> mdi-checkbox-marked-circle </v-icon>
              <span v-if="selectedIssue.resolved">Unresolve</span>
            </v-btn>
          </v-list-item-action>

          <v-list-item-action>
            <v-btn
              class="ma-2"
              rounded
              small
              outlined
              color="red"
              data-test="deleteIssueButton"
              @click="onDeleteIssue"
              :disabled="disableInputs"
            >
              <v-icon left>mdi-delete-circle </v-icon>
              <!-- <span v-if="!selectedIssue.resolved">Delete</span> -->
            </v-btn>
          </v-list-item-action>
        </v-list-item>

        <v-list-item>
          <v-subheader>COMMENTS</v-subheader>
        </v-list-item>

        <!-- COMMENT INPUT -->
        <v-list-item>
          <v-text-field
            v-model="newIssueCommentText"
            :disabled="disableInputs"
            outlined
            dense
            label="Add a comment"
          >
            <template slot="append-outer">
              <v-btn
                outlined
                rounded
                small
                color="primary"
                @click="addIssueComment"
                :disabled="disableInputs"
              >
                Submit
              </v-btn>
            </template>
          </v-text-field>
        </v-list-item>

        <!-- COMMENTS -->
        <v-layout class="comments-list-container">
          <v-list dense width="100%" class="comments-list">
            <v-list-item v-for="comment of orderedIssueComments" :key="comment.createdAt">
              <v-list-item-icon>
                <v-icon color="primary"> mdi-comment </v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title class="issue-comment">
                  {{ comment.comment }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ timeAgo(new Date(Number(comment.createdAt))) }} by
                  {{ comment.owner }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-layout>
      </v-list>
    </v-layout>

    <!-- New issue-->
    <v-form v-if="selectedIssue && !selectedIssue.id">
      <v-text-field label="Selection" readonly v-model="selectedIssue.text" />
      <v-select
        ref="issueType"
        chips
        :items="['needs-help', 'indexing', 'new-word']"
        v-model="selectedIssue.type"
        label="Issue type"
      />
      <v-textarea ref="issueComment" solo v-model="newIssueCommentText" label="Comments" />
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="blue darken-1"
          text
          @click="onCancelNewIssue"
          data-test="cancelNewIssueButton"
        >
          Cancel
        </v-btn>
        <v-btn
          color="blue darken-1"
          text
          @click="onSubmitNewIssue"
          data-test="submitNewIssueButton"
        >
          Submit
        </v-btn>
      </v-card-actions>
    </v-form>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import en from 'javascript-time-ago/locale/en'
import TimeAgo from 'javascript-time-ago'
import logging from '../../logging'

TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

const logger = new logging.Logger('Issues Form')

export default {
  computed: {
    ...mapGetters(['selectedRegion', 'selectedIssue', 'issueMap', 'transcription', 'user']),

    disableInputs() {
      if (this.user) {
        return !this.transcription.editors.includes(this.user.name)
      } else {
        return true
      }
    },

    issues() {

      if (this.selectedRegion) {
        // logger.log('issue map changed')
        const regionId = this.selectedRegion.id
        let issues = this.issueMap[regionId] || []

        issues = issues.sort((a, b) => {
          if (a.createdAt < b.createdAt) return 1
          if (a.createdAt > b.createdAt) return -1
          return 0
        })

        return issues
      }
      return []
    },

    orderedIssueComments() {
      if (this.selectedIssue) {

        const issues = [...this.issues]
        const issueId = this.selectedIssue.id
        if (issues) {
          const thisIssue = issues.filter((i) => i.id === issueId).pop()
          const comments = [...thisIssue.comments]

          return comments.sort((a, b) => {
            if (a.createdAt < b.createdAt) return 1
            if (a.createdAt > b.createdAt) return -1
            return 0
          })
        } else {
          return []
        }

      } else {
        return []
      }
    },
  },
  data() {
    return {
      // selectedIssue: null,
      newIssueCommentText: '',
    }
  },

  methods: {
    ...mapActions(['setSelectedIssue']),

    onCancelNewIssue() {
      this.setSelectedIssue(null)
    },

    onDeleteIssue() {
      const id = this.selectedIssue.id
      logger.log('delete issue', id)
      const deleteIssue = confirm('Delete this issue forever?')
      if (deleteIssue) {
        const regionId = this.selectedRegion.id
        // const issues = this.issues.filter((issue) => issue.id !== id)
        this.$store.dispatch('deleteRegionIssue', { regionId, issueId: id })
      }
      this.setSelectedIssue(null)
    },

    /** TODO: needs tests */
    onSubmitNewIssue() {
      // bundle up issue details
      const newDate = `${+new Date()}`
      const comments = []
      if (this.newIssueCommentText.length) {
        comments.push({
          comment: `${this.newIssueCommentText}`,
          owner: this.user.name,
        })
      }
      const newIssue = {
        ...this.selectedIssue,
        comments,
        id: `issue-${this.selectedIssue.type}-${newDate}`
      }

      const regionId = this.selectedRegion.id
      this.$store.dispatch('addRegionIssue', { regionId, newIssue })

      // reset the form
      this.newIssueCommentText = ''
      this.setSelectedIssue(null)
    },

    issueColor(type) {
      const types = {
        indexing: 'yellow',
        'needs-help': 'red',
        'new-word': 'blue',
      }
      return types[type]
    },

    timeAgo(date) {
      if (date instanceof Date && !isNaN(date)) {
        return timeAgo.format(date)
      }
      return ''
    },

    addIssueComment() {
      const comment = this.newIssueCommentText
      if (!comment) {
        return
      }
      logger.info('Adding issue comment', comment)

      const regionId = this.selectedRegion.id
      const issueId = this.selectedIssue.id
      const comments = [...this.selectedIssue.comments]
      comments.push({
        comment,
        createdAt: `${+new Date()}`,
        owner: this.user.name,
      })

      this.$store.dispatch('updateRegionIssue', {
        regionId,
        issueId,
        issueUpdate: { comments }
      })

      this.newIssueCommentText = ''
    },


    onResolveIssue() {
      const issue = this.selectedIssue
      const newResolved = !this.selectedIssue.resolved
      
      // this.$store.dispatch('saveIssueResolved', {
      //   id: issue.id,
      //   resolved: newResolved,
      // })
      
      const regionId = this.selectedRegion.id
      this.$store.dispatch('updateRegionIssue', {
        regionId,
        issueId: issue.id,
        issueUpdate: { resolved: newResolved }
      })

      this.selectedIssue.resolved = newResolved
    },
  },
}
</script>

<style scoped>
.region-issue-item:hover {
  background-color: #f5f5f5;
}

.region-issue-type-icon {
  padding-top: 12px;
}
</style>
