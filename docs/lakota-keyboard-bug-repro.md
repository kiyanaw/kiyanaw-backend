# Lakota Keyboard Bug Repro Plan (issue #245)

**Bug:** On macOS with the RCLakota keyboard layout, pressing Shift+6 (the compose key) followed by a letter deletes all text in the region editor instead of inserting the diacritical character (á é í ó ú ŋ ǧ š ȟ ž č).

---

## Step 1 — Install the RCLakota keyboard on your Mac

Download the layout file from the link provided in the issue:
https://drive.google.com/file/d/16FrKGRhPbPuhtO0Ks7tW8N4qZrN5uilw/view?usp=sharing

Place the downloaded file in `~/Library/Keyboard Layouts/`, then go to **System Settings → Keyboard → Input Sources**, click **+**, and add "RCLakota". Restart your Mac before testing.

---

## Step 2 — Deploy the debug logging to staging

Debug logging has been added to `rteService.ts` on the current branch. Deploy it:

```bash
npx amplify publish
```

---

## Step 3 — Reproduce the bug

1. Go to `https://bundle.kiyanaw.dev` and log in as owner
2. Open any existing transcription (or create one with audio)
3. Open the browser DevTools console (**Cmd+Option+J**)
4. Enable logging by typing this in the console and pressing Enter:
   ```javascript
   window.debugKeyboard = true
   ```
5. Create a region on the waveform and click it to open the editor
6. Click into the editor and type some normal text, e.g.: `hello world`
7. Switch your input source to **RCLakota** (use the flag icon in the macOS menu bar)
8. Press **Shift+6**, then press **`a`**
9. Observe whether `hello world` disappears from the editor

---

## Step 4 — Copy the console log back

The console will have printed a sequence of `[kb:regionId:main]` entries covering every keyboard and composition event. Copy everything from the first `keydown` entry through the final `quill:text-change` entry and paste it back into the session.

### What the log will tell us

| Field | Why it matters |
|---|---|
| `quillSel` on `compositionstart` | If `length > 0` here, that is the deletion trigger — Quill deletes the selection when composition begins |
| `targetTag` / `targetClass` on `compositionstart` | Quill only processes the event if `event.target` resolves to a non-Embed blot inside the editor |
| `ranges` on `beforeinput` | If `collapsed: false` with a large range, Quill's `handleBeforeInput` may be deleting the range |
| `ops` on `quill:text-change` | Shows exactly what Quill applied — a `delete` op covering the full text confirms the bug |
