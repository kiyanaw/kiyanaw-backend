# Kiyânaw Transcription Platform – React SPA & AWS Amplify Integration Requirements

> Scope: These functional requirements describe **how a refactored React Single-Page Application must interface with the existing AWS Amplify backend**.  Only the frontend layer is being rewritten; all cloud resources, GraphQL schema, DataStore models, authentication pools, and S3 buckets remain unchanged.  Vue-specific constructs (Vuex store, event bus) are to be replaced with React-appropriate patterns, but **feature parity with the current Vue 2 implementation is mandatory**.

---

## 1. Amplify Bootstrapping & Configuration

1.1  The React entry-point (e.g., `index.tsx`) SHALL import `Amplify` from `aws-amplify` and invoke `Amplify.configure(awsExports)`, where `awsExports` is the generated file from `amplify pull`/`push`.  
 • Follow Amplify v6 modular-import guidelines—install and import individual category packages (`@aws-amplify/auth`, `@aws-amplify/datastore`, `@aws-amplify/storage`, `@aws-amplify/ui-react`) only where used.  
 • Cognito Hosted UI settings are automatically derived from the same configuration; no extra signing-key setup is required.

1.2  A singleton `AmplifyProvider` React component SHALL wrap the entire component tree and expose Amplify context (see §2, §3).

1.3  Build tooling (Webpack/Vite/CRA) SHALL inject the correct AWS environment at compile time—development, staging, production—via `.env` variables.

1.4  The application **MUST** remain buildable without Amplify credentials (mock mode) for CI.

---

## 2. Authentication & Session Management

2.1  User authentication SHALL leverage the `<Authenticator>` component and `useAuthenticator()` hook from `@aws-amplify/ui-react`, internally using the Cognito Hosted UI flow with the existing user-pool IDs and callback URLs.  
 • For customised flows, calls to the low-level `Auth` class (`signIn`, `signOut`, etc.) remain acceptable.

2.2  A wrapper hook `useAuth()` SHALL delegate to `useAuthenticator()` and expose:  
 • `user` (AuthenticatorUser),  
 • `route` ( "authenticated" | "unauthenticated" ),  
 • convenience aliases `signIn()`, `signOut()`, `refreshSession()`.  
This supersedes the Vuex `user` module.

2.3  The navigation bar **MUST** subscribe to `useAuth` and re-render menu items based on `signedIn`.

2.4  Authentication tokens SHALL automatically authorise **DataStore**, **Storage**, and **API** calls via Amplify's built-in IAM/Cognito integration (no manual header injection).

2.5  The application SHALL listen to `Hub` events (`auth`, `datastore`) so that token refreshes or sign-outs immediately purge/rehydrate client state.

---

## 3. Data Layer (AWS Amplify DataStore)

3.1  The React SPA SHALL reuse the existing GraphQL schema and generated JS models (e.g., `Transcription`, `Region`, `Pointer`).

3.2  A domain-centric hook set—`useTranscriptions`, `useTranscription(id)`, `useRegions(transcriptionId)`—MUST provide CRUD, live query, and subscription logic.  Internally these hooks SHALL:
 a) Call `DataStore.query(...)` on mount.  
 b) Establish `DataStore.observe/observeQuery` subscriptions for real-time updates.  
 c) Handle optimistic updates and outbox state tracking (see §3.4).

3.3  Model mutations SHALL be wrapped in utility functions mirroring Vuex actions (e.g., `updateRegion`, `createRegion`, `deleteRegion`, `savePointer`).

3.4  The hooks SHALL expose `outboxBusy` and queue retry logic akin to the `saveState.DS_OUTBOX_BUSY` pattern from the current Vuex store, ensuring no silent write failures.

3.5  All JSON-encoded fields (`text`, `issues`, `comments`) MUST be stringified/parsed transparently within the hooks.

3.6  The React implementation SHALL maintain **offline-first** behaviour:  
 • Queries wait for `DataStore.start()` readiness.  
 • Mutations queue locally and transparently sync when connectivity returns.

3.7  Error boundaries around DataStore operations SHALL surface user-facing toasts/snackbars identical to existing behaviour (e.g., waveform peak fetch failures).

---

## 4. Storage (S3 Managed Uploads)

4.1  Media uploads (audio/video) SHALL invoke `Storage.uploadData` (modern API replacing `Storage.put`) which automatically chooses multipart uploads for large files, preserving the bucket/key conventions established by `TranscriptionService.uploadMediaFile`.

4.2  The Upload form component MUST surface real-time upload progress via the `progressCallback` option supplied to `Storage.uploadData` and disable its submit action until the Promise resolves.

4.3  Upon success, the component SHALL create a `Transcription` record through `DataStore.save`, linking uploaded S3 object URL and metadata (duration, MIME type, etc.).

4.4  Download/playback access for waveforms and videos SHALL utilise `Storage.getUrl` (fallback to `Storage.get`) with appropriate `level` and `expires` options matching existing access policies.

---

## 5. State Management Replacement (Vuex ➜ React)

5.1  Vuex modules (`region`, `transcription`, `user`) SHALL be fully replaced by React Context/Reducer or Redux Toolkit slices.  Parity requirements:
 • Derived selectors (`regions`, `selectedRegion`, `editingUsers`…) remain available as memoised selectors or hook return values.  
 • Mutations commit atomically so React renders remain minimal.

5.2  Global, cross-component events currently broadcast over `EventBus` (Vue) SHALL migrate to React Context callbacks or a lightweight event emitter (e.g., mitt).  Names (`refresh-local-text`, `transcription-ready`, etc.) must stay unchanged for consumer components.

5.3  Any debouncing or timeout behaviour (currently via `smart-timeout`) SHALL be reproduced with `lodash.debounce` or native `setTimeout` wrappers.

---

## 6. Media Playback & Waveform Visualisation

6.1  React components SHALL wrap WaveSurfer.js (and plugins) duplicating features: region overlays, zoom, playback speed, drag-selection when `canEdit==true`.

6.2  WaveForm component MUST expose the same custom events (`region-in`, `region-out`, `waveform-ready`, `region-updated`).  Event signatures remain unchanged.

6.3  Video fallback for `.mp4` sources MUST render a draggable `<video>` element synchronised to WaveSurfer playback.

---

## 7. Rich-Text Editing

7.1  Region text editors SHALL migrate to `react-quill` with Quill v1+; custom formats (`known-word`, etc.) need re-registration identical to `helpers.registerCustomQuillFormats`.

7.2  Toolbar actions (play region, create issue, ignore word…) must call the same DataStore hooks to keep backend contracts intact.

---

## 8. Permissions & Roles Enforcement

8.1  Helper selectors (`canEdit`, `isAuthor`, etc.) MUST be re-implemented as plain JS utilities or hook return values.

8.2  UI widgets SHALL disable/enable actions based on these selectors exactly matching the prior Vue behaviour.

---

## 9. Progressive Web App & Offline Behaviour

9.1  Service Worker configuration (Workbox/CRA) SHALL cache static assets and DataStore local databases to enable offline editing identical to the existing app.

9.2  The UI MUST display an "Offline" banner when `navigator.onLine==false` or DataStore is in `NetworkStatus.reconnecting`.

---

## 10. DevOps & CI/CD

10.1  `amplify push` commands remain backend-only; the React project's build pipeline SHALL not destroy or recreate cloud resources.

10.2  Deployment artefact (static build) MUST be uploaded to the same S3 bucket / CloudFront distribution currently serving the Vue SPA.

10.3  Automated tests SHALL mock Amplify interactions using `@aws-amplify/datastore` in-memory adapter or Jest mocks.

---

## 11. Transitional Constraints

11.1  During migration, both Vue and React frontends MAY coexist; therefore, **model names, GraphQL IDs, and storage paths cannot change**.

11.2  Immutable field semantics (e.g., `Transcription.author`) must remain read-only client-side.

---

## Summary

The above requirements ensure the React refactor remains a drop-in replacement from the cloud's perspective, preserving all DataStore, Auth, Storage, and real-time collaboration behaviours established in the original Vue 2 + Vuex implementation while modernising the frontend technology stack. 