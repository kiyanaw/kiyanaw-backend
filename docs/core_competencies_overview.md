# Kiyânaw Transcription Platform – Core Functional Overview

## Purpose
Kiyânaw is a web-based platform for creating, editing, and managing multimedia transcriptions—primarily for Indigenous language revitalisation projects.  This document captures the **core competencies** of the system in a technology-agnostic manner so that they can be re-implemented in any modern web stack (e.g., React).

---

## 1. User Management & Session Handling
1. The system **authenticates** users through a secure, cloud-based identity provider.
2. After successful authentication, users are **redirected** to the main dashboard.
3. The application maintains **client-side session state**, exposing helper functions that indicate the current user object and signed-in status.
4. The global navigation adjusts its menu items according to the user's authentication state (e.g., showing "Sign out" when signed in).

## 2. Navigation & Layout
1. A persistent left-hand navigation drawer (or top bar on small screens) provides links to core sections:
   • Transcriptions Repository
   • Statistics / Analytics
   • About / Help
2. Primary content is rendered within a routed view container to enable single-page-application navigation without full reloads.

## 3. Media Upload & Ingestion
1. Contributors can upload **audio (`.mp3`) or video (`.mp4`) files** alongside a required title.
2. An **upload form** disables the submission button until both the title and media file are provided.
3. Upon submission the system:
   a) Streams the media file to cloud object storage while exposing real-time progress.
   b) Creates a new *Transcription* record in the data layer that stores metadata (title, source URL, MIME type, duration, timestamps, etc.).
   c) Links the uploading contributor to the newly created transcription for permission management.
4. After a successful upload, the UI navigates directly to the dedicated *Transcription Editor* for that media item.

## 4. Transcriptions Repository (List View)
1. The list view queries all available *Transcription* records once local/offline data synchronisation is ready.
2. A tabular interface displays columns such as Title, Owner, Duration, Coverage %, Issue Count, Last Edited, Media Type, and Source.
3. Features include:
   • Client-side search on title.
   • Column sorting (default: last updated descending).
   • Pagination (default: 10 rows per page).
4. Row entries link to the respective transcription editor, and raw media links launch the source file directly.
5. An "Add new" action opens the media upload form.

## 5. Transcription Editor Workspace
When routed to `/transcribe/:id(/:regionId)?`, the workspace loads the selected transcription and its associated regions.  The layout is divided into:
1. **Waveform (or Video) Player** – shows the media timeline, regions, and playback controls.
2. **Stationary Inspector** – a tabbed interface that exposes forms and tools for metadata, region content, and issues.
3. **Scrollable Region List** – a virtualised list of all segments for quick navigation.

### 5.1 Region List Behaviour
• Displays text, timing, translation, index badges, collaborator avatars, and issue colour coding.
• Clicking a region scrolls it into view, selects it, updates the URL, and, if applicable, triggers playback of that segment.

### 5.2 Media Player Requirements
• Loads the source media and visualises its waveform (or video frame) with region overlays.
• Offers controls for play/pause, mark/cancel region, zoom, playback speed, dictionary lookup, and—if permissions allow—region creation via drag selection.
• Emits events such as `region-updated`, `region-in`, `region-out`, and `player-ready` for synchronisation with other components.
• For video sources, a floating video element mirrors the audio waveform and can be repositioned.

### 5.3 Inspector Tabs
1. **Transcription Metadata** – edit title, comments, privacy setting, disable analyser flag, and list of editors.
2. **Region Content** – rich-text editors for original text and translation, plus region tools (play, toggle note, create issue, ignore word, clear format, delete region).
3. **Issues** – issue tracker interface (see section 8).

Tab selection automatically switches to the *Region* tab whenever a new region becomes active.

## 6. Transcription Metadata Form
1. Two-way-bound inputs allow the author to edit general metadata.
2. The editors list pulls contributor usernames and prevents removal of the original author.
3. All inputs are disabled when the current user lacks sufficient permissions.

## 7. Region Editing
1. Dual rich-text editors (primary & translation) support formatting, inline suggestions, and hot-key/toolbar actions.
2. Text analysis service provides:
   • Known-word detection and auto-formatting.
   • Spelling suggestions with inline dropdown replacements.
3. Cursor and selection positions are emitted for real-time collaborative editing.

## 8. Issue Tracking
1. Each region can contain zero or more issues.
2. The issues panel displays text, owner, age, resolved status, and comment count.
3. Users with edit rights can create, resolve/unresolve, delete issues, and add comments (newest first).
4. Supported issue types include `needs-help`, `indexing`, and `new-word`, each with distinct colour coding.

## 9. Dictionary Lookup
1. A lookup action (button or hot-key) opens a modal.
2. Submitting a term queries an external dictionary/lexicon API and displays structured results (wordform, morphological analysis, definitions).

## 10. Permissions & Roles
1. Each transcription record stores `author` (single) and `editors` (multi-value) fields.
2. UI components check permissions before enabling destructive or privileged actions.
3. Permission checks are centralised in computed selectors to ensure consistent enforcement.

## 11. Data Persistence & Offline Support
1. Core domain models include *Transcription*, *Region*, *Contributor*, *TranscriptionContributor*, and *Pointer*.
2. All CRUD operations persist through an offline-first data layer that automatically synchronises with the cloud backend.
3. The application waits for the local store to be ready before performing queries or mutations.

## 12. Media Processing & Analytics
1. Pre-generated waveform peak JSON may be fetched; fall-back messaging informs users if the file is unavailable or processing.
2. Coverage metrics (total region duration ÷ media duration) are derived dynamically.

## 13. Responsive Design & Accessibility
1. Layout adapts to screen size (e.g., persistent drawer on medium-plus screens, adaptive video/waveform sizing on mobile).
2. Keyboard shortcuts complement mouse interactions (e.g., spacebar toggles play/pause).
3. All interactive elements include appropriate ARIA labels, focus management, and colour-contrast compliance.

---

## Summary
The Kiyânaw Transcription Platform delivers a collaborative, offline-capable workflow for uploading media, segmenting audio/video, annotating transcriptions, tracking issues, and publishing structured linguistic data.  Its core competencies are deliberately expressed here without reference to specific libraries or frameworks, enabling a technology-agnostic re-implementation—such as a React-based frontend paired with cloud-native services for authentication, storage, and real-time messaging. 