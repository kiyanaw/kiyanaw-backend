# Kiyânaw React Frontend – Tailwind Migration Workplan

> **Objective**  Replace ad-hoc CSS with Tailwind CSS ^3 and align styling with the look & feel of the original Vue (Vuetify) interface shown in the reference screenshots.  This plan assumes the current React implementation inside `src/` (see `react_refactor_workplan.md`) is the baseline.

---

## Phase 0 — Preparation & Tooling
1. **Install deps**  
   ```bash
   npm i -D tailwindcss@^3 postcss autoprefixer
   npx tailwindcss init -p
   ```
2. **Configure Tailwind** (`tailwind.config.js`)  
   • Add custom blue (`#1E3A8A`) & accent palette to match Vuetify nav.  
   • Extend font-family with `"Roboto", "Noto Sans", sans-serif`.  
   • Enable dark mode class strategy.
3. **Content purge paths** → `['./index.html','./src/**/*.{js,ts,jsx,tsx}']`.
4. **Global styles**  
   • Delete unused rules in `index.css` / `App.css`.  
   • Add `@tailwind base; @tailwind components; @tailwind utilities;` to `src/index.css`.
5. **VS Code Tailwind IntelliSense** – recommend extension.
6. **CI** – update Amplify Console build spec to run `tailwindcss -i ./src/index.css -o ./dist/index.css --minify` if not handled by Vite.

---

## Phase 1 — Layout Shell Conversion
| Task | Component | Details |
|------|-----------|---------|
|1. Drawer & AppBar|`AppLayout.tsx`|Replace `.app-header` & `.navigation-drawer` classes with Tailwind flex utilities. Sidebar width `w-64`, bg `bg-ki-blue`, text `text-white`.
|2. Responsive breakpoints|`AppLayout.css`|Remove media queries → use `md:` & `lg:` variants. Implement `fixed md:static` sidebar.
|3. Auth buttons|Inline|Convert buttons to Tailwind (`py-2 px-3 rounded hover:bg-white/10`).

---

## Phase 2 — Pages Refactor
1. **Transcribe List (`TranscriptionsTable.tsx`)**  
   • Replace table markup with semantic `<table class="min-w-full text-sm">`.  
   • Use `sticky top-0` header & `hover:bg-gray-50`.  
   • Coverage bar → `relative h-1 bg-gray-200 rounded` + inner `absolute inset-0 bg-green-500` width style.  
   • Pagination controls → `flex justify-center gap-4 mt-6`.
2. **Upload Form (`UploadForm.tsx`)**  
   • Use `space-y-6` for vertical rhythm.  
   • Replace progress bar with `h-2 rounded bg-blue-100` + dynamic `bg-blue-600` width.
3. **Stats & About pages** – quick conversion of headers.

---

## Phase 3 — Editor Workspace
1. **Waveform Player container**  
   • Parent `div` → `relative bg-white border border-gray-200 rounded`.  
   • Header bar `flex justify-between items-center bg-gray-200 h-8 px-4`.  
   • Channel-strip buttons → `btn` component class (`inline-flex items-center justify-center w-8 h-8 ...`).
2. **Stationary Inspector (`StationaryInspector.tsx`)**  
   • Tabs → `flex` w/ `divide-x divide-gray-200`. Active tab underline `after:content-[''] after:absolute after:bottom-0 after:h-0.5 after:w-full after:bg-primary`.  
   • Scroll area `overflow-y-auto px-4 py-6`.
3. **Region List**  
   • Wrapper `flex flex-col h-full`.  
   • Region item card `shadow-sm` & `hover:bg-blue-50`.
4. **Region Editor / Quill**  
   • Use Tailwind for header & tool buttons.  
   • Retain Quill styling but wrap in `prose` for typography.
5. **Issues Panel**  
   • Accordions → `border rounded-lg mb-4` with status color ring (`ring-2 ring-red-400` etc).

---

## Phase 4 — Atoms & Utility Components
1. Create **`Button`**, **`Card`**, **`Modal`**, **`Badge`** utility components that expose Tailwind class names to reduce duplication.
2. Replace custom `.loading-spinner` with Tailwind `animate-spin` and SVG icon.
3. Extract color constants to `tailwind.config.js` (`ki-blue`, `ki-accent`, `issue-red`, ...).

---

## Phase 5 — Remove Legacy CSS
1. Delete component-level `.css` files once Tailwind equivalents are verified.  Keep Quill & WaveSurfer overrides only.
2. Run `npm run lint` + fix className duplicates.

---

## Phase 6 — Responsive & Mobile Polishing
1. Validate screenshots at widths: 1440, 1024, 768, 480.  
2. Ensure waveform stays sticky, region list scrolls vertically, body non-scroll (match annotated screenshot).  Use `h-[calc(100vh-223px)]` etc.
3. Convert drawer to top-bar on `sm` screens if desired.

---

## Phase 7 — Accessibility & Dark Mode
1. Add `dark:` variants for backgrounds / text.  
2. Ensure all buttons have `focus-visible:outline` utilities.  
3. Use `sr-only` where appropriate.

---

## Phase 8 — QA & Regression Testing
1. Lighthouse audit ≥90 scores on mobile & desktop.  
2. Visual diff against legacy Vue pages.  
3. Update Vitest snapshots for new markup.

---

## Phase 9 — Documentation & Handover
1. Update `README.md` with Tailwind usage guidelines & component cookbook links.  
2. Add style-guide page under `/about/styleguide`.

---

### Milestone Checklist
- [ ] Tailwind configured & builds pass
- [ ] App shell converted
- [ ] Core pages restyled
- [ ] Editor workspace parity
- [ ] Legacy CSS removed
- [ ] Responsive verified
- [ ] Dark mode functional
- [ ] Docs updated

---

*Generated <span style="font-variant: small-caps;">Tailwind Migration Workplan</span> — v0.1* 