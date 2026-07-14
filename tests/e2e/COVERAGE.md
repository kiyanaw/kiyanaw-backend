# E2E Coverage Matrix

This file tracks which core user flows are covered by end-to-end tests. Update it whenever a spec is added, extended, or removed. Its purpose is to make coverage gaps visible so regressions don't go undetected — issue #305 (discoverable transcriptions broken for weeks) motivated its creation.

## Status key

- **covered** — at least one test exercises this flow end-to-end against the real API
- **partial** — tested in one direction but not the full lifecycle (e.g. create but not delete)
- **untested** — no e2e test exists for this flow

---

## Authentication

| Flow | Status | Spec |
|---|---|---|
| Authenticated user can reach protected routes | covered | `transcription.spec.ts` |
| Unauthenticated redirect to login | untested | — |
| Sign-out / sign-in round-trip | untested | — |

## Transcription list

| Flow | Status | Spec |
|---|---|---|
| List loads for owner (My Transcriptions tab) | covered | `transcription.spec.ts` |
| Shared with Me tab | covered | `reload.spec.ts`, `invites.spec.ts` |
| Title search/filter | covered | `list-management.spec.ts` |
| Sort control | covered | `list-management.spec.ts` |
| Delete via list trash button | covered | `list-management.spec.ts` |
| Mobile list layout | untested | — |
| Privacy badge (Private / Discoverable) | untested | — |

## Upload & media processing

| Flow | Status | Spec |
|---|---|---|
| Upload MP3 and wait for READY status | covered (via helper) | `transcription.spec.ts`, all specs using `createTestTranscription` |
| Media processing overlay visible during processing | untested | — |
| Media error overlay | untested | — |

## Editor — regions

| Flow | Status | Spec |
|---|---|---|
| Create region by waveform drag | covered | `transcription.spec.ts` |
| Delete region | covered | `transcription.spec.ts` |
| Region count visible in header | covered | multiple specs |
| Merge two adjacent regions | covered | `editor-text.spec.ts` |
| Region bounds resize/drag | untested | — |

## Editor — text editing

| Flow | Status | Spec |
|---|---|---|
| ORIG text typed and persists after reload | covered | `editor-text.spec.ts` |
| TRAN (translation) text typed and persists after reload | covered | `editor-text.spec.ts` |
| Spellcheck highlight on typed word | covered | `transcription.spec.ts` |
| Spellcheck correction (click suggestion) | untested | — |
| ORIG/TRAN tab toggle | covered (via TRAN test) | `editor-text.spec.ts` |

## Editor — issues & comments

| Flow | Status | Spec |
|---|---|---|
| Owner creates issue from text selection | covered | `issues.spec.ts` |
| Issue visible in IssuesPanel after reload | covered | `issues.spec.ts` |
| Issue visible to invited editor | covered | `issues.spec.ts` |
| Resolve issue; persists after reload | covered | `issues.spec.ts` |
| Delete issue; persists after reload | covered | `issues.spec.ts` |
| Post comment; visible to other user | covered | `issues.spec.ts` |
| Delete comment | covered | `issues.spec.ts` |
| Issue type change | untested | — |

## Collaboration / invites

| Flow | Status | Spec |
|---|---|---|
| Owner sends invite | covered | `invites.spec.ts` |
| Invitee accepts invite | covered | `invites.spec.ts` |
| Accepted transcription appears in Shared with Me | covered | `invites.spec.ts`, `reload.spec.ts` |
| Invite permission level select visible | covered | `invite-management.spec.ts` |
| Change pending invite permission | covered | `invite-management.spec.ts` |
| Delete pending invite | covered | `invite-management.spec.ts` |
| Editor can create/delete regions on shared transcription | covered | `sharing.spec.ts` |
| Viewer cannot create regions | covered | `sharing.spec.ts` |
| Revoke / resend invite | untested | — |

## Discoverable (public) transcriptions

| Flow | Status | Spec |
|---|---|---|
| Non-owner can open a discoverable transcription | covered | `discoverable.spec.ts` |
| Non-owner denied access to private transcription | covered | `discoverable.spec.ts` |

## Access control (GraphQL / AppSync layer)

| Flow | Status | Spec |
|---|---|---|
| Uninvited user cannot read/mutate regions | covered | `security-acl.spec.ts` |
| Uninvited user cannot list issues/comments | covered | `security-acl.spec.ts` |

## Language Database

| Flow | Status | Spec |
|---|---|---|
| /database page loads; language selector visible | covered | `database.spec.ts` |
| Search input visible and accepts text after language selected | covered | `database.spec.ts` |
| Search returns results or no-results message | covered | `database.spec.ts` |
| Lemma detail page loads and shows lemma header | covered | `database.spec.ts` |
| Attestation click navigates to transcription | untested | — |
| Stats page | untested | — (page is not yet implemented) |

## Out of scope (tracked here, not planned near-term)

- Conflict-resolution dialog (`ConflictResolutionDialog.tsx`) — optimistic-versioning edge case, hard to reproduce in e2e
- Concurrent-edit presence indicators — same; needs two simultaneous editing sessions
- Mobile list card layout — requires viewport override; low priority vs. desktop
- Amplify sign-out/sign-in UI — Amplify-internal selectors, fragile; covered by auth-state reset in global setup
