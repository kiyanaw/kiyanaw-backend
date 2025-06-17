**Note:** All new React source code MUST be created under the `./src/` directory.  
The legacy Vue implementation in `src_old/` is **read-only** and serves solely as reference during the migration.

- [x] **Phase 0 – Discovery & Setup**
    1. ✅ Review work plan documents and functional requirements `docs/amplify_react_requirements.md`, `docs/core_competencies_overview.md` and `docs/functional_requirements.md`.
    2. ✅ Initialise new React project inside the current root folder (e.g., Vite + TypeScript).  
        • ✅ Install Amplify v6 modular pkgs per docs/amplify_react_requirements.md §1.  _(Functional Req – Overview & §1-15 for baseline review)_

- [x] **Phase 1 – Amplify Bootstrapping (Critical path)**
    1. ✅ Configure Amplify in `src/main.tsx` (`Amplify.configure(awsExports)`). _(Functional Req §12.3 – DataStore readiness & offline sync)_  
    2. ✅ Wrap tree in `<ThemeProvider>` – (§1.2).  
    3. ✅ Ensure `.env.{mode}` maps to correct `aws‐exports.js` (§1.3).

- [x] **Phase 2 – Authentication**  (Functional Req §1, Amplify React Req §2)
    1. ✅ Replace Vuex `user` module (`src_old/store/user.js`) with `useAuth` hook.  
    2. ✅ Implement `<Authenticator>` shell; protected routes.
    3. ✅ Re-create nav sign-in/out logic (`src_old/components/SignIn.vue`, `router.js`).

- [x] **Phase 3 – Global State & Events**
    1. ✅ Convert Vuex stores:
        • ✅ `transcription.js` → `useLoadTranscriptions` / context.  
        • ✅ `region.js`→ `useRegions`.  
    2. ✅ Replace `bus.js` EventBus with `mitt` emitter _(Functional Req §11.1 – EventBus realtime updates)_.  
    3. ✅ Port selectors (e.g., `canEdit`, `editingUsers`) to pure utils.  

- [x] **Phase 4 – Routing & Layout (Functional Req §2)**
    1. ✅ Set up React Router v6 layout shell replicating drawer behaviour.  
    2. ✅ Drawer links: `/transcribe-list`, `/stats`, `/about`.  
    3. ✅ Responsive breakpoints via custom CSS (match Vuetify rules).

- [x] **Phase 5 – Media Upload Flow (Functional Req §3)**
    1. ✅ Re-create `Add.vue` (`src_old/components/transcribe/Add.vue`) as `UploadForm.tsx`.  
        • ✅ Use `Storage.uploadData` (§4.1) with progress callback.  
        • ✅ Disable submit until title + file.  
    2. ✅ On success do `DataStore.save(Transcription)` and navigate to editor.

- [x] **Phase 6 – Transcriptions List (Functional Req §4)**
    1. ✅ Port `List.vue` (`src_old/components/transcribe/List.vue`) => `TranscriptionsTable.tsx`.  
       • ✅ Columns per §4.2, search, sort, pagination (custom table).  
       • ✅ Query `useLoadTranscriptions` hook.

- [x] **Phase 7 – Editor Workspace Shell (Functional Req §5)**
    1. ✅ Port `Transcribe.vue` & child layout into `EditorPage.tsx`.  
    2. ✅ Split into 3 panes: Waveform/Video, StationaryInspector, RegionList.

- [x] **Phase 8 – Waveform & Playback (Functional Req §5.2, Amplify React Req §6)**
    1. ✅ Wrap WaveSurfer.js in `WaveformPlayer.tsx`.  
       • ✅ Source from S3 via `Storage.getUrl` (§4.4).  
       • ✅ Support regions plugin, timeline, zoom, speed.
       • ✅ Load peaks data from `${source}.json` following Vue pattern.
    2. ✅ Handle events (`region-in/out`, `waveform-ready`, etc.).
    3. ✅ Implement video overlay for `.mp4` (`AudioPlayer.vue` ref).

- [x] **Phase 9 – Region List & CRUD (§5.1)**
    1. ✅ Port `RegionPartial.vue` and scrolling logic.  
    2. ✅ Clicking item selects & scrolls into view, syncs URL.

- [x] **Phase 10 – Stationary Inspector Tabs (Functional Req §§6–8)**
    1. ✅ Metadata Form – port `TranscriptionForm.vue` (§6).  
    2. ✅ Region Editors – port `RegionForm.vue`, `RTE.vue` (§7).  
       • ✅ Use `react-quill` + custom formats (`helpers.registerCustomQuillFormats`).  
    3. ✅ Issues Panel – port `IssuesForm.vue` (§8).  

- [x] **Phase 11 – Data Hooks & Mutations**
    1. ✅ Implement DataStore hooks (`useLoadTranscription`, `useRegions`, `useIssues`).  
    2. ✅ Wrap mutations (`updateRegion`, `createRegion`, etc.) ensuring optimistic UI _(Functional Req §12.2)_.  
    3. ✅ Handle JSON fields parse/stringify _(Functional Req §12.2)_.

- [x] **Phase 12 – Permissions & Roles (Functional §10, Amplify React Req §8)**
    1. ✅ Re-create helpers `helpers.js::canEdit`, `isAuthor`.  
    2. ✅ Guard UI controls & pages.

- [x] **Phase 13 – Dictionary Lookup (Functional §9)**
    1. ✅ Port `Lookup.vue` modal into `LookupModal.tsx`; integrate external API.

---

### Cross-cutting Tasks
- [x] **TypeScript Model Generation** – ensure DataStore models generated (`amplify codegen models`).
- [x] **Lint & Formatting** – ESLint + Prettier aligned with repo standards.
- [ ] **Code Quality Improvements** – address linting issues systematically.
- [ ] **Accessibility** – replicate ARIA & keyboard shortcuts (§13 in Core Competencies).
- [ ] **Performance** – lazy-load heavy deps (WaveSurfer, React-Quill).

### Code Quality Next Steps
- [x] **Fix Build Issues** – remove unused variables/imports (15 TypeScript errors).
- [ ] **TypeScript Improvements** – replace `any` types with proper interfaces (65 errors).
- [ ] **React Hook Dependencies** – fix missing dependency warnings (13 warnings).
- [x] **Generated Model Types** – update `@ts-ignore` to `@ts-expect-error` in models.
- [x] **Peaks Data Loading** – implement waveform peaks data loading following Vue pattern.
- [ ] **Testing Setup** – configure Vitest + React Testing Library for ≥90% coverage.
- [ ] **Pre-commit Hooks** – set up Prettier formatting on commit.

---

#### Reference Mapping
| Functional Doc § | Legacy Source Path | New React Target |
|------------------|-------------------|-------------------|
| 3 (Media Upload) | `src_old/components/transcribe/Add.vue` | `src/components/upload/UploadForm.tsx` |
| 4 (List) | `src_old/components/transcribe/List.vue` | `src/components/list/TranscriptionsTable.tsx` |
| 5.2 (Waveform) | `src_old/components/transcribe/AudioPlayer.vue` | `src/components/player/WaveformPlayer.tsx` |
| 5.1 (Region Item) | `src_old/components/transcribe/RegionPartial.vue` | `src/components/regions/RegionItem.tsx` |
| 6 (Metadata) | `src_old/components/transcribe/TranscriptionForm.vue` | `src/components/forms/TranscriptionForm.tsx` |
| 7 (Region Editing) | `src_old/components/transcribe/RegionForm.vue`, `src_old/components/transcribe/RTE.vue` | `src/components/regions/RegionEditor.tsx` |
| 8 (Issues) | `src_old/components/transcribe/IssuesForm.vue` | `src/components/issues/IssuesPanel.tsx` |
| 9 (Lookup) | `src_old/components/transcribe/Lookup.vue` | `src/components/lookup/LookupModal.tsx` |
| Vuex Stores | `src_old/store/*.js` | `src/hooks/*`, `src/context/*` |

> For full functional descriptions see `docs/functional_requirements.md`, `docs/amplify_react_requirements.md`, `docs/core_competencies_overview.md`. 