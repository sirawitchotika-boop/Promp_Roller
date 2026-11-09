# Prompt Roller — Maintenance Handoff

**Prepared:** 2026-11-09
**Repository:** https://github.com/sirawitchotika-boop/Promp_Roller
**App:** `prompt-roller-v4/`
**Verified main at preparation:** `c604ae9721f09f3e39a758daacf2dd8a9ec27cde` (PR #20)
**Deployment:** `.github/workflows/pages.yml`, from pushes to `main`

## Current review work

- **R0:** Completed read-only audit. The app has **24 JavaScript modules**, each with an EOF marker. No broad rewrite is justified.
- **R1 / PR #21:** Deduplicate JSON scene-import handling. **130/130** isolated checks passed, with four new tests. Changes `js/import.js` and `js/test-integration.js` only.
- **R2 / PR #22:** Deduplicate TXT/JSON download mechanics. **126/126** isolated baseline checks passed and mock browser before/after downloads matched. Changes `js/editor-io.js` only.
- **Docs-only PR (this update):** `README.md`, `WORKFLOW-GUIDE.md`, historical roadmap and this handoff. Merge **after** the code PRs.

**The PRs target `main` directly and are independent** (different changed production files). Review/merge #21 first, then #22, then the docs PR. Verify each merge landed on `main`, not another feature branch. Do not auto-merge.

## Already accepted releases

- UI-0 through UI-3: PRs #12, #13, #14, #15.
- UI-4A: PR #16, dark in-app slot editor.
- UI-4B and UI-4C: original stacked PRs #17 and #18, actually landed on `main` in PR #19; best-effort Back, scroll and draft recovery.
- Save/data safety: PR #20, with persistent warning when localStorage fails, protection of unreadable original state and rejection of invalid JSON scene imports.
- User reported phone checks through #20 passed.

## Contracts that must not change

- **State:** `localStorage["prompt_roller_v4_state"]`; backups restore by validated replacement, not merge. Unreadable original bytes must not be overwritten automatically.
- **Draft:** `sessionStorage["prompt_roller_v4_draft"]` holds hand-edited text only for same-tab refresh with a matching generated-prompt baseline.
- **Slots:** 7 active Subject (`body, hairC, hairS, eyes, skin, face, outfit`) and 4 Scene (`camera, action, light, venue`). Archived `hands, prop, depth` survive backups and text exchange.
- **Roll behavior:** SFW/Mix/NSFW, Mood, guard tags, locks, coherent scene presets and linked Outfit unchanged.
- **Modules:** 24 classic JS files in the same order as `index.html`. Keep each under 200 lines, all `window.__EOF` markers and `app.js` required list.
- **UI:** Existing dark mobile layout; don't redesign without a request. Android Back is controlled by the browser: Edit → Back → Roll may work, but Back from Roll can exit without an app confirmation.
- **Privacy:** Do not commit user vocabulary, private imports, backups, tokens or secrets.

## One final verification after merges

1. On the live app, **Roll**, then edit one slot using Save and Cancel.
2. Go to **Edit → Tools → Backup** and download the JSON file.
3. Go to **Edit → Tools → Self-test** and check the pass total is **130/130**, with no save warning during normal use.

These are short mobile acceptance checks; isolated mock tests do **not** count as physical phone tests. Use one future PR per necessary fix, based on the current `main`. No further refactor is planned without a clear need.
