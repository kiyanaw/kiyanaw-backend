# Kiyânaw Transcription Platform – Functional Requirements

## Overview
Kiyânaw is a web-based platform for creating, editing and managing multimedia transcriptions.  Authenticated contributors can upload media (audio/video), collaboratively segment and annotate its content, track issues, and publish structured data through AWS Amplify DataStore.  The application is built with Vue 2 + Vuetify and integrates WaveSurfer.js for waveform visualisation and Quill for rich-text editing.  The following sections capture the explicit functional requirements inferred from the source code.

---

## 1  Authentication & User Session
1.1  The system SHALL authenticate users with AWS Amplify Auth.
1.2  Upon successful authentication the application SHALL redirect the user to the root route (`/`).
1.3  The navigation drawer SHALL adapt to the login state, exposing "Sign out" when `signedIn==true` and "Sign in" otherwise.
1.4  The Vuex store SHALL expose getters `user` and `signedIn` for global session state.

## 2  Navigation & Layout
2.1  The left navigation drawer (persistent on ≥ `md` screens) SHALL provide links to:
 a) Transcriptions list (`/transcribe-list/`)
 b) Stats (`/stats/`)
 c) About (`/about/`).
2.2  Application content SHALL be rendered inside `<router-view>` within the `v-main` area.

## 3  Media Upload (Add.vue)
3.1  The UI SHALL offer a form with:
 • Title (`v-text-field`).
 • File chooser accepting `.mp3` or `.mp4`.
 • Upload button disabled until both title and file are provided.
3.2  On upload the component SHALL:
 a) POST the file to S3 via `TranscriptionService.uploadMediaFile`, tracking progress.
 b) Create a new `Transcription` record in DataStore with metadata (title, source URL, MIME type, timestamps, etc.).
 c) Link the current `Contributor` to the new transcription via a `TranscriptionContributor` join entity.
3.3  After successful creation the UI SHALL navigate to `/transcribe-edit/<transcriptionId>`.

## 4  Transcriptions List (List.vue)
4.1  The list view SHALL query all `Transcription` items after DataStore emits `ready`.
4.2  A `v-data-table` SHALL display columns: Title, Owner, Length, Coverage, Issues, Last edit, Type, Source.
4.3  The table SHALL support:
 • Client-side search (title).
 • Sorting by `dateLastUpdated` (desc default).
 • Pagination (10 items per page).
4.4  Each row's title and source SHALL link to the edit page and raw media respectively.
4.5  An "Add new" button SHALL route to `/transcribe-add/`.

## 5  Transcribe Editor (Transcribe.vue)
5.1  When routed to `/transcribe-edit/:id(/:regionId)?` the component SHALL load the identified transcription and its regions via Vuex action `loadTranscription`.
5.2  The layout divides into:
 a) AudioPlayer (waveform & transport).
 b) StationaryEditor (tabbed inspector).
 c) Scrollable Region list (virtualised).
5.3  The component SHALL react to DataStore `ready`, EventBus events, and viewport breakpoints for responsive layout.

### 5.1  Region List
5.1.1  `RegionPartial` items SHALL render textual, timing and translation info, index badges, editor avatars, and note coloration.
5.1.2  Clicking a region SHALL scroll it into view, select it, update URL, and (unless it's a note) play the audio.

### 5.2  Waveform Player (AudioPlayer.vue)
5.2.1  The player SHALL load the source media using WaveSurfer.js with regions & timeline plugins.
5.2.2  Controls SHALL include play/pause, mark/cancel region, zoom slider, speed slider, dictionary lookup and (when editable) region creation.
5.2.3  When `canEdit==true` region drag-selection SHALL be enabled.
5.2.4  Player events SHALL emit `region-updated`, `region-in`, `region-out`, `waveform-ready` and handle inbound region seeking.
5.2.5  If media is video (`isVideo==true`), a floating `<video>` element SHALL mirror playback and allow side swapping.

### 5.3  Stationary Editor Tabs
 • Transcription (tab-0) – metadata form (see §6).
 • Region       (tab-1) – rich text + translation editors, region tools (see §7).
 • Issues       (tab-2) – issue tracking UI (see §8).
Tab selection SHALL auto-switch to Region when a new region becomes selected.

## 6  Transcription Metadata (TranscriptionForm.vue)
6.1  Form fields SHALL bind to Vuex state allowing the author to edit `title`, `comments`, `isPrivate`, `disableAnalyzer`, and `editors` list.
6.2  `editors` combobox SHALL pull usernames from the `Contributor` collection and ensure the `author` cannot be removed.
6.3  Inputs SHALL be disabled for users other than the transcription `author`.

## 7  Region Editing (RegionForm.vue & RTE.vue)
7.1  Two Quill editors (main & secondary) SHALL allow editing of text and translation respectively.
7.2  Toolbar-less editors SHALL provide hot-features via buttons:
 • Play region.
 • Toggle note (convert region to annotation only).
 • Create issue from text selection.
 • Ignore word (format).
 • Clear format.
 • Delete region (author only).
7.3  Text analysis:
 a) When analyzer is enabled the system SHALL query `Lexicon` for known words & suggestions.
 b) Known words SHALL be auto-formatted (`known-word` class) or hinted.
 c) Suggestions SHALL trigger an inline dropdown for replacements.
7.4  Selections SHALL emit cursor data via Vuex for real-time multi-user cursors.

## 8  Issue Tracking (IssuesForm.vue)
8.1  Each region MAY contain zero or more issues (`issues` array).
8.2  The issues list SHALL display issue text, owner, age, resolved state and comment count.
8.3  Users with editor rights SHALL be able to:
 • Add new issues (selection-based).
 • Resolve / unresolve issues.
 • Delete issues.
 • Add comments; comments are ordered newest-first.
8.4  Issue types supported: `needs-help`, `indexing`, `new-word` (with colour coding).

## 9  Dictionary Lookup (Lookup.vue)
9.1  Pressing the lookup button (`mdi-card-search`) or `onLookup` event SHALL open a modal dialog.
9.2  Typing a term and hitting <Enter> SHALL invoke `Lexicon.lookup` and display rich results (wordform, analysis, definitions).

## 10  Permissions & Roles
10.1  Each `Transcription` record SHALL hold `author` (string) and `editors` (array).
10.2  Inputs or destructive actions SHALL be disabled for non-editors and/or non-authors depending on context.
10.3  Component-level `disableInputs` computed props SHALL enforce these restrictions.

## 11  Data Persistence (AWS Amplify DataStore)
11.1  Domain models used: `Transcription`, `Region`, `Contributor`, `TranscriptionContributor`, `Pointer`.
11.2  All create/update/delete operations in components SHALL persist via `DataStore.save` or trigger Vuex actions that ultimately call DataStore.
11.3  The application SHALL listen to Amplify Hub `datastore:ready` before operating on offline data.

## 12  Media Processing
12.1  Waveform peak JSON (`peaks`) MAY be loaded; if unavailable a snackbar SHALL report "Processing waveform data" error.
12.2  `coverage` metric SHALL be derived from total region length / media duration (see TODO in comments).

## 13  Responsive Design
13.1  Vuetify breakpoints SHALL adapt layout:
 • Drawer permanent only on `mdAndUp`.
 • Waveform/video sizing adjusted for `xsOnly`.
 • Region list switches between side-pane and full width based on screen size.

## 14  Accessibility & Usability
14.1  Playback controls SHALL be accessible via mouse and keyboard (spacebar toggles play/pause via listener – presently commented out).
14.2  Video element SHALL be draggable left/right by click.
14.3  Loading states (circular/spinner) SHALL appear when waveform or data is loading.

---

## Summary
The Kiyânaw Transcription Platform delivers a full-stack, collaborative workflow enabling Indigenous language transcriptions to be uploaded, segmented, annotated and refined by multiple contributors.  Core capabilities encompass secure authentication, media upload & storage, rich waveform-synchronised editing, lexical analysis with dictionary integration, granular issue tracking, permission-based collaboration, and offline-first persistence through AWS Amplify DataStore.  The UI leverages Vuetify for responsive design and WaveSurfer/Quill for advanced media and text handling, ensuring editors can efficiently produce high-quality, well-structured transcription data ready for publication and further linguistic research. 