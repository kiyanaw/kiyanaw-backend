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
              :color="selectedIssue.resolved ? 'error' : 'success'"
              @click="resolveIssue"
            >
              <v-icon v-if="!selectedIssue.resolved" left> mdi-checkbox-marked-circle </v-icon>
              <span v-if="!selectedIssue.resolved">Resolve</span>

              <v-icon v-if="selectedIssue.resolved" left> mdi-checkbox-marked-circle </v-icon>
              <span v-if="selectedIssue.resolved">Unresolve</span>
            </v-btn>
          </v-list-item-action>

          <v-list-item-action>
            <v-btn class="ma-2" rounded small outlined color="red" @click="onDeleteIssue">
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
          <v-text-field v-model="newIssueCommentText" outlined dense label="Add a comment">
            <template slot="append-outer">
              <v-btn outlined rounded small color="primary" @click="addIssueComment">
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
                <v-icon v-if="user.name === comment.owner" color="primary"> mdi-comment </v-icon>
                <v-icon v-if="user.name !== comment.owner" color="primary"> mdi-comment </v-icon>
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
        <v-btn color="blue darken-1" text @click="onCancelNewIssue"> Cancel </v-btn>
        <v-btn color="blue darken-1" text @click="onSubmitNewIssue"> Submit </v-btn>
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
    ...mapGetters(['selectedRegion', 'selectedIssue', 'user']),

    issues() {
      if (this.selectedRegion) {
        return this.selectedRegion.issues || []
      }
      return []
    },

    orderedIssueComments() {
      if (this.selectedIssue) {
        const comments = this.selectedIssue.comments
        return comments.sort((a, b) => {
          if (a.createdAt < b.createdAt) return 1
          if (a.createdAt > b.createdAt) return -1
          return 0
        })
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
        const issues = this.issues.filter((issue) => issue.id !== id)
        this.$store.dispatch('updateRegion', { issues })
      }
      this.setSelectedIssue(null)
    },

    onSubmitNewIssue() {
      const issue = { ...this.selectedIssue }
      issue.comments = []
      const newDate = `${+new Date()}`
      issue.id = `issue-${issue.type}-${newDate}`
      console.log('new issue comment text', this.newIssueCommentText)
      if (this.newIssueCommentText.length) {
        logger.info('adding issue comment')
        issue.comments.push({
          comment: `${this.newIssueCommentText}`,
          createdAt: newDate,
          owner: this.user.name,
        })
      }

      const issues = this.selectedRegion.issues
      issues.push(issue)

      logger.info('new issues', issues)

      this.$store.dispatch('updateRegion', { issues })
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

      const issues = this.selectedRegion.issues
      issues.forEach((item) => {
        if (item.id === this.selectedIssue.id) {
          item.comments.push({
            comment,
            createdAt: `${+new Date()}`,
            owner: this.user.name,
          })
        }
      })

      this.$store.dispatch('updateRegion', { issues })
      this.newIssueCommentText = ''
    },

    resolveIssue() {
      this.$store.dispatch('updateSelectedIssue', { resolved: !this.selectedIssue.resolved })
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
