<template>
  <v-container :class="{ locked: locked }" style="padding-top: 3px">
    <v-layout
      v-if="!region.isNote"
      class="region-editor-layout"
      :class="{ inRegion: isInRegion, review: needsReview }"
      style="position: relative"
    >
      <span class="region-index">{{ region.index }}</span>
      <v-flex xs2 md1 @click="playRegion">
        <div class="timestamps">
          <span class="time region-start">{{ normalTime(region.start) }}</span>
          <br />
          <span class="time region-end">{{ normalTime(region.end) }}</span>
        </div>
      </v-flex>

      <v-flex xs9 md10>
        <div>
          <div :id="'editor-' + region.id" />
        </div>
      </v-flex>

      <v-flex md1 xs1 />
    </v-layout>

    <v-layout class="region-options-layout" :class="{ isNote: region.isNote }" @click="stayFocused">
      <v-flex xs2 md1>
        <v-icon v-if="locked" class="region-lock-icon"> mdi-lock </v-icon>
        <div v-if="locked" class="region-options-label">
          {{ lockUser }}
        </div>
        <div
          v-if="editing && canEdit & !region.isNote"
          class="region-options-label label-translation"
        >
          English
        </div>
        <div v-if="region.isNote" class="region-options-label label-note">
          <v-icon color="#dbd9ce"> mdi-note-outline </v-icon>
        </div>
      </v-flex>

      <v-flex xs10 md10>
        <div class="region-options-edit">
          <div :id="'editor-translate-' + region.id" />
          <div v-if="editing & canEdit & !region.isNote">
            <div class="region-options-controls">
              <a @click="deleteRegion">Delete this region</a>
              &nbsp;
              <span>
                Version {{ region.version }} by {{ region.userLastUpdated }} --
                {{ region.id }}
              </span>
              note: {{ region.isNote }}
            </div>
          </div>
        </div>
      </v-flex>
    </v-layout>

    <v-dialog v-model="dialog" persistent max-width="60%">
      <v-card>
        <v-tabs v-model="activeTab" vertical>
          <v-tab :key="0">
            <v-icon left> mdi-flag-outline </v-icon>&nbsp;&nbsp;Issues&nbsp;&nbsp;&nbsp;&nbsp;
          </v-tab>
          <v-tab :key="1" :disabled="!currentSelectionText">
            <v-icon left> mdi-flag-plus-outline </v-icon>New issue
          </v-tab>

          <!-- ISSUE DETAILS -->
          <v-tab-item>
            <v-layout v-if="selectedIssue">
              <v-list width="100%">
                <v-subheader>
                  <a @click="selectedIssue = null">&larr; Back to issues</a>
                </v-subheader>
                <v-list-item>
                  <v-list-item-avatar>
                    <v-icon v-if="!selectedIssue.resolved" color="error" large>
                      mdi-alert-circle
                    </v-icon>
                    <v-icon v-if="selectedIssue.resolved" color="success" large>
                      mdi-check-circle
                    </v-icon>
                  </v-list-item-avatar>

                  <v-list-item-content>
                    <v-list-item-title>
                      <span :class="'issue-' + selectedIssue.issueType">{{
                        selectedIssue.text
                      }}</span>
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
                      <v-icon v-if="!selectedIssue.resolved" left>
                        mdi-checkbox-marked-circle
                      </v-icon>
                      <span v-if="!selectedIssue.resolved">Resolve</span>

                      <v-icon v-if="selectedIssue.resolved" left>
                        mdi-checkbox-marked-circle
                      </v-icon>
                      <span v-if="selectedIssue.resolved">Unresolve</span>
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
                        <v-icon v-if="user.name === comment.owner" color="primary">
                          mdi-comment
                        </v-icon>
                        <v-icon v-if="user.name !== comment.owner" color="primary">
                          mdi-comment
                        </v-icon>
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

            <!-- ISSUE LIST -->
            <v-layout v-if="!selectedIssue && issues">
              <v-list width="100%">
                <v-list-item>
                  <h4>{{ issues.length }} issues</h4>
                </v-list-item>
                <v-list-item v-for="issue in issues" :key="issue.id" two-line>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-chip class="ma-2" :color="issue.resolved ? 'success' : 'error'" small>
                        <v-avatar left>
                          <v-icon v-if="!issue.resolved" small> mdi-alert-circle </v-icon>
                          <v-icon v-if="issue.resolved" small> mdi-check-circle </v-icon>
                        </v-avatar>
                        {{ issue.type }}
                      </v-chip>
                      <a @click="selectedIssue = issue">
                        <span :class="'issue-' + issue.issueType">{{ issue.text }}</span>
                        {{ timeAgo(new Date(Number(issue.createdAt))) }} by {{ issue.owner }}
                      </a>
                      <span class="comment-count">
                        <v-icon small>mdi-comment</v-icon>
                        {{ issue.comments.length }}
                        <v-btn icon small dark color="error" @click="deleteIssue(issue.id)">
                          <v-icon small color="error">mdi-delete</v-icon>
                        </v-btn>
                      </span>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-layout>
          </v-tab-item>

          <v-tab-item>
            <v-text-field label="Selection" readonly :value="currentSelectionText" />
            <v-select
              ref="issueType"
              chips
              :items="['needs-help', 'indexing', 'new-word']"
              label="Issue type"
            />
            <v-textarea ref="issueComment" solo label="Comments" />
          </v-tab-item>
        </v-tabs>
        <v-card-actions>
          <v-spacer />
          <v-btn v-if="!currentSelectionText" color="blue darken-1" text @click="dialog = false">
            Close
          </v-btn>
          <v-btn v-if="currentSelectionText" color="blue darken-1" text @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn v-if="currentSelectionText" color="blue darken-1" text @click="onSubmitIssue">
            Submit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import Timeout from 'smart-timeout'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import utils from './utils'
import Lex from '../../services/lexicon'
// import UserService from '../../services/user'

import en from 'javascript-time-ago/locale/en'
import TimeAgo from 'javascript-time-ago'
TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

/**
 * Register our custom class attributor. This is used to flag a word as
 * a 'known word', when it matches a word in the lexicon.
 */
const Parchment = Quill.import('parchment')
let KnownWord = new Parchment.Attributor.Class('known-word', 'known-word', {
  scope: Parchment.Scope.INLINE,
})
let IgnoreWord = new Parchment.Attributor.Class('ignore-word', 'ignore-word', {
  scope: Parchment.Scope.INLINE,
})
let IssueNeedsHelp = new Parchment.Attributor.Class('issue-needs-help', 'issue-needs-help', {
  scope: Parchment.Scope.INLINE,
})
let IssueIndexing = new Parchment.Attributor.Class('issue-indexing', 'issue-indexing', {
  scope: Parchment.Scope.INLINE,
})
let IssueNewWord = new Parchment.Attributor.Class('issue-new-word', 'issue-new-word', {
  scope: Parchment.Scope.INLINE,
})

Parchment.register(KnownWord)
Parchment.register(IgnoreWord)
Parchment.register(IssueNeedsHelp)
Parchment.register(IssueIndexing)
Parchment.register(IssueNewWord)
Quill.register('modules/cursors', QuillCursors)

// let typingTimer
// let cursorTimer

// let blurFlag = false
const ISSUES_TAB = 0
const NEW_ISSUE_TAB = 1

export default {
  props: [
    'region',
    'canEdit',
    // this has the region where the playback head is located
    'inRegions',
    // true when the user is editing this region
    'editing',
    'user',
    'transcriptionId',
  ],

  data() {
    return {
      // regionText: this.$props.text,
      // hasFocus: false,
      // _regionTranslation: null,
      locked: false,
      lockUser: '',
      // used for blur/focus timing between editors in the same region
      blurFlag: false,
      // used to ignore the first 'blur' event
      firstBlur: true,
      dialog: false,
      currentSelection: null,
      lastSelection: null, // needed for issue creation
      currentSelectionText: '',
      //
      activeTab: ISSUES_TAB,
      //
      issues: [],
      selectedIssue: null,
      newIssueCommentText: '',
    }
  },

  computed: {
    /**
     * TODO: possibly not used
     */
    isInRegion() {
      // const inRegions = this.$props.inRegions
      // const regionId = this.$props.region.id
      // console.log('isInRegion', inRegions, regionId)
      // if (inRegions && regionId) {
      //   return this.inRegions.indexOf(this.region.id) > -1
      // }
      return null
    },

    /**
     * ✓ TESTED
     * @description Return true when the current editor has '??' in the text.
     */
    needsReview() {
      const doubleQuestion = this.region.text.filter((word) => word.insert.indexOf('??') > -1)
      if (doubleQuestion.length) {
        return true
      }
      return false
    },

    /**
     * ✓ TESTED
     * @description Puts comments for the selected issue in order, newest at the top.
     */
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

  mounted() {
    this.locked = false

    if (!this.region.isNote) {
      this.mountMainEditor()
    }
    this.mountSecondEditor()

    this.reportKnownWords(this.region.text)

    this.bindEditorEvents()

    // grab issues
    this.issues = this.region.issues

    // TODO: remove this, it's just for debugging.
    window.quill = this.quill
    window.cursors = this.cursors
    window.quillTranslate = this.quillTranslate
    window.cursorsTranslate = this.cursorsTranslate

    // update the temporary translation value
    // this._regionTranslation = this.region.translation
  },

  methods: {
    /**
     * ✓ TESTED
     * @description Returns the count of the number of issues for this region.
     */
    getIssueCount() {
      return this.issues.filter((issue) => !issue.resolved).length
    },

    /**
     * This is accessed externally for saving transcription details.
     */
    getMainOps() {
      let ops = []
      try {
        ops = this.quill.getContents().ops
      } catch (e) {
        // not used
      }
      return ops
    },

    /**
     *
     * @description Locks a region for a given user.
     */
    lock(lockUser = 'unknown') {
      console.log('This region is locked', this.region.id)
      if (lockUser === 'unknown') {
        alert(
          `There was a problem obtaining a region lock on region ${this.region.index}, try again...`,
        )
        this.$emit('editor-blur', this.region.id, { silent: true })
      } else {
        this.locked = true
        this.$emit('editor-blur', this.region.id, { silent: true })
        this.lockUser = lockUser
        if (!this.region.isNote) {
          this.quill.disable()
        }
        this.quillTranslate.disable()
      }
    },

    unlock() {
      console.log('This region is unlocked', this.region.id)
      this.locked = false
      this.lockUser = ''
      if (!this.region.isNote) {
        this.quill.enable()
      }
      this.quillTranslate.enable()
      this.cursors.clearCursors()
      this.cursorsTranslate.clearCursors()
    },

    /**
     * TODO: this should maybe be a computed.
     * Turns a 1.398456847365252 float into 0:01.40 time
     */
    normalTime(value) {
      return utils.floatToMSM(value)
    },
    /**
     * Handler for when user clicks on the timestamps for this region.
     */
    playRegion() {
      this.$emit('play-region', this.region.id)
      if (`#${this.region.id}` !== this.$router.history.current.hash) {
        // this.$router.push({ path: `#${this.region.id}` })
        this.$router.push({ path: `/transcribe-edit/${this.transcriptionId}/${this.region.id}` })
      }
      // keep the editor from losing focus
      this.maybeFocusBlur({ type: 'focus' })
    },

    stayFocused() {
      this.maybeFocusBlur({ type: 'focus' })
    },

    /**
     *
     */
    deleteRegion() {
      this.$emit('delete-region', this.region)
    },
    /**
     *
     */
    insertDelta(delta) {
      this.quill.updateContents(delta)
    },
    /**
     *
     */
    clearCursors() {
      this.cursors.clearCursors()
    },

    /**
     * If we are receiving cursor updates they are in another region.
     */
    setCursor(data) {
      // console.log('setting cursor', data)
      if (data.source === 'secondary') {
        this.quillTranslate.setText(data.text || '', 'api')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
        // set the cursor
        const exists = this.cursorsTranslate.cursors().filter((needle) => (needle.id = data.id))
        if (exists.length) {
          this.cursorsTranslate.createCursor(data.user, data.user, data.color)
        }
        this.cursorsTranslate.moveCursor(data.user, data.range)
        this.cursors.removeCursor(data.user)
        this.cursors.clearCursors()
      } else {
        this.quill.setContents(data.text, 'silent')
        // set the cursor
        const exists = this.cursors.cursors().filter((needle) => (needle.id = data.id))
        if (!exists.length) {
          this.cursors.createCursor(data.user, data.user, data.color)
        }
        this.cursors.moveCursor(data.user, data.range)
        this.cursorsTranslate.clearCursors()
        this.cursorsTranslate.removeCursor(data.user)
      }
      window.cursors = this.cursors
    },

    /**
     * Whenever a user types, check all of the words in the editor against a list
     * of known words in the Lexicon™, careful to make sure that when words break
     * that they are discarded as 'known'.
     */
    async invalidateKnownWords() {
      if (this.region.isNote) {
        return
      }
      // reset all the 'known-word' format
      this.quill.formatText(0, 9999, 'known-word', false)
      // loop through and refresh
      const knownWords = await Lex.getKnownWords()
      // console.log(`known words: ${knownWords}`)
      // add a space at the beginning to allow 0-index matches
      const text = this.quill.getText()
      const matchedWordsIndex = []
      // TODO: we will need to refactor this to break the text down by word and match word-for-word
      // instead of using a regex across the board, we can't match words like `ēkot(a)` with parens
      // right now
      for (let item of knownWords) {
        // check for matches
        let re = new RegExp(item, 'g')
        let match
        let matches = []
        while ((match = re.exec(text))) {
          // console.log(`match: ${match}`)
          // TODO: this is icky, find a better way
          // make sure we're matching whole words and not just partials
          // grab the character right after our match to
          const surroundingCharacters = [' ', '\n', '.', ',', '(', ')']
          const beforeIsSpace =
            match.index === 0 || surroundingCharacters.includes(text[match.index - 1])
          const afterIsSpace = surroundingCharacters.includes(text[match.index + item.length])
          if (beforeIsSpace && afterIsSpace) {
            matches.push(match)
          }
        }
        for (let match of matches) {
          this.quill.formatText(match.index, item.length, 'known-word', true)
          matchedWordsIndex.push([match.index, item.length])
        }
      }
    },

    /**
     * Tell the lexicon service that we have known words so we can keep track of them
     * without searching a second time.
     */
    async reportKnownWords(deltas) {
      const known = deltas
        .filter((item) => item.attributes && item.attributes['known-word'] !== undefined)
        .map((item) => item.insert)
      Lex.addKnownWords(known)
    },

    /**
     * Returns a list of the quill text cleansed of newline characters.
     */
    getTokenizedText() {
      return this.quill
        .getText()
        .replace(/(\r\n|\n|\r)/gm, '')
        .split(' ')
        .filter((item) => item && item.indexOf('\n') === -1)
    },

    /**
     * Syncs up the module regionText with the editor data.
     */
    notifyRegionChanged(editor) {
      if (!this.locked) {
        let ops
        if (!this.region.isNote) {
          ops = this.quill.getContents().ops
        } else {
          ops = []
        }
        this.region.text = ops
        this.region.translation = this.quillTranslate.getText()
        setTimeout(() => {
          // check if the issue text has changed.
          this.updateIssueText()
          this.$emit('region-text-updated', {
            id: this.region.id,
            editor: editor,
            text: ops,
          })
        }, 50)
      }
    },

    /**
     * ✓ TESTED
     * @description Handles changes to the main editor.
     */
    async onEditorTextChange(delta, oldDelta, source) {
      // console.log('region change', this.region.id, delta, oldDelta, source)
      if (source === 'user') {
        // check for breakages
        // notify this editor changed
        this.notifyRegionChanged('main')
        this.invalidateKnownWords()
      }
    },

    async onTranslationTextChange(delta, oldDelta, source) {
      if (source === 'user') {
        this.notifyRegionChanged('secondary')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
      }
    },

    async onCursorChange(range, source, text) {
      this.$emit('region-cursor', {
        id: this.region.id,
        range,
        source,
        text,
      })
    },

    async onSubmitIssue() {
      let issueType = this.$refs.issueType.selectedItems
      const problemText = this.currentSelectionText

      if (issueType.length === 0) {
        return
      }
      issueType = issueType[0]
      const created = `${+new Date()}`
      const owner = this.user.name

      // new issue
      const issue = {
        id: `issue-${issueType}-${created}`,
        type: issueType,
        createdAt: created,
        resolved: false,
        owner,
        text: problemText,
        comments: [],
      }

      const comment = this.$refs.issueComment.lazyValue
        ? this.$refs.issueComment.lazyValue.trim()
        : null
      if (comment) {
        issue.comments.push({
          comment,
          createdAt: created,
          owner,
        })
      }

      this.quill.formatText(
        this.lastSelection.index,
        this.lastSelection.length,
        `issue-${issueType}`,
        issue.id,
      )

      // save the issue
      this.issues.push(issue)
      this.dialog = false

      // notify of changes
      this.onIssuesUpdated()
    },

    addIssueComment() {
      const comment = this.newIssueCommentText
      if (!comment) {
        return
      }
      this.selectedIssue.comments.push({
        comment,
        createdAt: `${+new Date()}`,
        owner: this.user.name,
      })
      this.newIssueCommentText = ''
      this.onIssuesUpdated()
    },

    // clearIssueForm() {
    //   // this.$refs.issueType.selectedItems = []
    // },

    resolveIssue() {
      // selectedIssue.resolved = !selectedIssue.resolved
      this.selectedIssue.resolved = !this.selectedIssue.resolved
      const issue = this.selectedIssue
      const issueType = `issue-${issue.type}`
      console.log('selected issue', issueType)
      if (this.selectedIssue.resolved) {
        // remove the formatting in the editor
        // console.log('issue type', issue.type)
        this.quill.formatText(issue.index, issue.text.length, issueType, false)
      } else {
        this.quill.formatText(issue.index, issue.text.length, issueType, issue.id)
      }
      this.onIssuesUpdated()
    },

    deleteIssue(id) {
      console.log('delete issue', id)
      const deleteIssue = confirm('Delete this issue forever?')
      if (deleteIssue) {
        this.issues = this.issues.filter((issue) => issue.id !== id)
        this.onIssuesUpdated()
      }
    },

    // used to trigger a save for issues
    onIssuesUpdated() {
      this.notifyRegionChanged('main')
    },

    /**
     * We clicked one of the region action buttons, now we need to deal with it.
     */
    onSelectionAction(action) {
      const formats = this.quill.getFormat(this.currentSelection)
      if (action === 'flag-selection') {
        console.log('formats under selection', formats)
        // check for format under cursor
        const formatsKeys = Object.keys(formats)
        if (formatsKeys.length) {
          const firstIssueKey = formatsKeys.shift()
          const firstIssueId = formats[firstIssueKey]
          // show the under the selection
          const selectedIssue = this.issues.filter((item) => item.id === firstIssueId).pop()

          this.selectedIssue = selectedIssue
          this.activeTab = ISSUES_TAB
          this.dialog = true
        } else if (this.currentSelection.length) {
          // we have a selection, create a new issue
          this.activeTab = NEW_ISSUE_TAB
          this.dialog = true
        } else {
          // we just have the cursor somewhere, show issue list
          this.selectedIssue = null
          this.activeTab = ISSUES_TAB
          this.dialog = true
        }
        // this.clearIssueForm()
      } else if (action === 'ignore-selection') {
        this.quill.formatText(
          this.currentSelection.index,
          this.currentSelection.length,
          'ignore-word',
          !formats['ignore-word'],
        )
      }
    },

    async onEditorSelectionChange(range) {
      window.quill = this.quill
      // save selections for future use
      if (!this.locked) {
        this.currentSelection = range
        if (range) {
          this.lastSelection = range
          if (range.length === 0) {
            this.currentSelectionText = ''
            // just a cursor, check for format
            // const [leaf, offset] = this.quill.getLeaf(range.index)

            // const format = this.quill.getFormat(range)
            // if there are any issues in this region, enable the button
            if (this.issues.length) {
              this.$emit('text-selection', { 'issue-needs-help': true })
            } else {
              this.$emit('text-selection', false)
            }
          } else {
            this.currentSelectionText = this.quill.getText(range.index, range.length)
            this.$emit('text-selection', true)
          }
          // throttle the number of cursor updates
          Timeout.clear(`cursor-change-timeout-main-${this.region.id}`)
          Timeout.set(
            `cursor-change-timeout-main-${this.region.id}`,
            this.onCursorChange,
            100,
            range,
            'main',
            this.region.text,
          )
          // we must delay the focus event to give the other editor's blur
          // event a chance to fire first
          this.$nextTick(() => {
            this.maybeFocusBlur({
              type: 'focus',
              source: 'main',
            })
          })
        } else {
          this.maybeFocusBlur({
            type: 'blur',
            source: 'main',
          })
          // we've lost focus, shut the buttons off
          this.$emit('text-selection', false)
        }
      }
    },

    updateIssueText() {
      if (this.region.isNote) {
        return
      }
      const contents = this.quill.getContents()
      let index = 0
      for (const leaf of contents.ops) {
        if (leaf.attributes) {
          const issueKey = Object.keys(leaf.attributes)
            .filter((key) => key.startsWith('issue'))
            .pop()
          // if (leaf.attributes && leaf.attributes['issue-needs-help']) {
          if (issueKey) {
            // console.log('index of issue', index)
            const issueId = leaf.attributes[issueKey]
            const text = leaf.insert
            const issue = this.issues.filter((item) => item.id === issueId).pop()
            if (issue) {
              issue.text = text
              issue.index = index
            }
          }
        }
        index = index + leaf.insert.length
      }
    },

    /**
     * Binds the editor events to the component.
     */
    async bindEditorEvents() {
      if (this.canEdit) {
        if (!this.region.isNote) {
          this.quill.on('text-change', this.onEditorTextChange)
          this.quill.on('selection-change', this.onEditorSelectionChange)
        }
        this.quillTranslate.on('text-change', this.onTranslationTextChange)

        // TODO: move this somewhere we can test it
        this.quillTranslate.on('selection-change', (range) => {
          if (!this.locked) {
            if (range) {
              Timeout.clear(`cursor-change-timeout-secondary-${this.region.id}`)
              Timeout.set(
                `cursor-change-timeout-secondary-${this.region.id}`,
                this.onCursorChange,
                100,
                range,
                'secondary',
                this.region.translation,
              )

              // we must delay the focus event to give the other editor's blur
              // event a chance to fire first
              this.$nextTick(() => {
                this.maybeFocusBlur({
                  type: 'focus',
                  source: 'secondary',
                })
              })
            } else {
              this.maybeFocusBlur({
                type: 'blur',
                source: 'secondary',
              })
            }
          }
        })
      }
    },

    /**
     * TODO: this may be irrelevant now that we manually blur
     */
    maybeFocusBlur(event) {
      // can't do anything if we're locked
      // console.log(`!! mayFocusBlur ${this.region.id} (${this.locked})`, event);
      if (this.locked || !this.canEdit) {
        return
      }
      if (event.type === 'blur') {
        // TODO: manually blur
        // When the editors load they fire off a blur we can't silence.
        // if (this.firstBlur) {
        //   this.firstBlur = false
        //   return
        // }
        // // console.log('blur called')
        // this.blurFlag = true
        // Timeout.set(
        //   `blur-timeout-${this.region.id}`,
        //   () => {
        //     if (this.blurFlag) {
        //       console.log(' --> blur fired')
        //       this.$emit('editor-blur', this.region.id)
        //       this.blurFlag = false
        //     }
        //   },
        //   25,
        //   this.region.id,
        // )
      } else {
        if (this.blurFlag) {
          // we're within the timeout, do not fire the blur event
          this.blurFlag = false
        } else {
          // we're clear, fire the event
          if (!this.editing) {
            // console.log(' --> focus fired')
            this.$emit('editor-focus', this.region.id)
            window.editor = this
          }
        }
      }
    },

    mountMainEditor() {
      this.quill = new Quill(this.$el.querySelector('#editor-' + this.region.id), {
        theme: 'snow',
        formats: [
          'known-word',
          'ignore-word',
          'issue-needs-help',
          'issue-indexing',
          'issue-new-word',
        ],
        modules: {
          toolbar: false,
          cursors: true,
        },
        readOnly: !this.canEdit,
      })
      this.cursors = this.quill.getModule('cursors')
      this.quill.root.setAttribute('spellcheck', false)
      this.quill.setContents(this.region.text, 'silent')
      // this.quill.blur();
    },

    mountSecondEditor() {
      // TODO: this needs to clear cursors, etc
      this.quillTranslate = new Quill(
        this.$el.querySelector('#editor-translate-' + this.region.id),
        {
          theme: 'snow',
          modules: {
            toolbar: false,
            cursors: true,
          },
          readOnly: !this.canEdit,
        },
      )

      this.quillTranslate.format('color', 'gray')
      this.quillTranslate.root.setAttribute('spellcheck', false)
      if (this.region.translation) {
        this.quillTranslate.insertText(0, this.region.translation.trim(), 'silent')
      }
      this.cursorsTranslate = this.quillTranslate.getModule('cursors')
      this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
      // this.quillTranslate.blur();
    },

    async realtimeUpdate(region) {
      if (this.editing) {
        // only update start/end times when editing
      } else {
        console.log('updating with new region')
        // deal with times
        this.region.start = region.start
        this.region.end = region.end
        // update text
        this.region.text = region.text
        this.quill.setContents(region.text, 'silent')
        // update translation
        this.translation = region.translation
        this.quillTranslate.setText(region.translation || '', 'silent')
        this.quillTranslate.formatText(0, 9999999, 'color', 'gray')
        // update verision
        this.region.version = region.version
        this.region.userLastUpdated = region.userLastUpdated
        this.dateLastUpdated = region.dateLastUpdated
      }
    },
    timeAgo(date) {
      if (date instanceof Date && !isNaN(date)) {
        return timeAgo.format(date)
      }
      return ''
    },
  },
}
</script>

<style>
#editor {
  max-height: 200px;
}

.editor-rendered {
  line-height: 1.42; /* same as quill */
}

.nonEdit,
.edit {
  padding: 12px 15px;
}

.review {
  background-color: #ffede6;
}

.inRegion {
  background-color: #edfcff;
}

.timestamps {
  padding-left: 8px;
  cursor: pointer;
}
.ql-container {
  font-size: 14px;
}
.ql-container.ql-snow {
  border: none;
  padding: 10px 0;
}

.region-actions {
  text-align: right;
}

.region-options {
  margin-left: 14px;
  color: grey;
}
.region-options-layout {
  background-color: #f5f5f5;
}
.isNote {
  background-color: #fcfaf0;
}
.region-index {
  position: absolute;
  top: 7px;
  right: 10px;
  font-size: 20px;
  font-weight: bolder;
  color: #b6b6b6;
}
.region-options-label {
  text-transform: uppercase;
  color: #888;
  font-size: 10px;
  margin-left: 8px;
}

.label-translation {
  margin: 23px 0px 24px 8px;
}
.label-note {
  margin: 14px 0px 24px 18px;
}

.label-options {
  position: relative;
  bottom: 1px;
}

.region-options-controls {
  padding: 0px 5px 5px 15px;
  text-transform: uppercase;
  font-size: 10px;
}
#translation {
  margin-top: -12px;
  margin-bottom: -10px;
}
.ql-editor {
  padding: 5px 15px !important;
}

.locked {
  opacity: 0.4;
}
.region-lock-icon {
  margin: 10px;
}
.v-tabs-items {
  padding-right: 15px;
}
.v-tabs--vertical {
  height: 650px;
}

.v-dialog {
  overflow: hidden;
}

.v-dialog .v-list-item__content {
  padding: 0;
}
.v-dialog .v-list-item__content,
.v-dialog .v-list-item--two-line {
  min-height: 30px;
}

.comments-list-container {
  top: 215px;
  position: absolute;
  bottom: -220px;
  overflow: auto;
  width: 100%;
}

.comment-count {
  position: absolute;
  right: 15px;
  top: 5px;
  font-size: 0.8em;
}

.comments-list .v-list-item__icon {
  margin-right: 8px !important;
}

.issue-comment {
  white-space: normal !important;
  font-weight: normal !important;
  margin-right: 70px;
}

[class^='known-word-'] {
  color: blue;
}

[class^='ignore-word'] {
  color: #777;
  font-style: italic;
}

[class^='issue-needs-help'] {
  background-color: #ffe6e6;
}

[class^='issue-indexing'] {
  background-color: #fff9e6;
}

[class^='issue-new'] {
  background-color: #e6f3ff;
}

[class^='issue']::before {
  content: '[';
}
[class^='issue']::after {
  content: ']';
}
</style>
