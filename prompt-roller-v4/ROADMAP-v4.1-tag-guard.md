# Prompt Roller — Version History & Maintenance Roadmap

Status: UI and save-safety updates through PR #20 merged on main. Refactor PRs #21/#22 are open; docs follow them.
Last updated: 2026-11-09

---

## 1. v4.1 — Tag-Guard Roll System (2026-11-03, complete)

**Problem:** Rolling all 14 slots as independent dice produces conflicting prompts (example: man in a necktie on a car, library background). Root cause: scene slots each secretly assume their own mini-scene, so independent rolls fight each other.

**Solution (Option B — tag-guard roll chain):**
- Items gain an optional `g` (guard) field. Scene slots roll as a linked chain: **venue -> action -> hands -> prop -> light -> depth -> camera**.
- Each roll filters candidates by guards already rolled. No match -> fall back to untagged items (never a dead roll).
- Untagged items = always safe. Fully backward compatible. Presets bypass the chain.

**Phases 0-5:** all DONE, gates passed. Suite grew 20 -> 25 checks. 247 items deduped + tagged via partial-JSON restore.

## 2. v4.2 — Roll Modes (2026-11-03/04, complete)

**Problem:** the old Spicy ON/OFF toggle was binary — no way to roll SFW-only, NSFW-only, or both.

**Solution:** one shared pool filter (`PRRoll.filterPool`) + a 3-button header segment:
- `SFW` = clean items only · `NSFW` = spicy items only (fallback to all if a slot has none) · `Mix` = everything.
- Legacy `spicy` boolean auto-migrates to `mode` on first load. Old backups and `!` imports keep working.
- Gate A passed 2026-11-03 (modes verified on Roll + Batch, self-test 29/29).

**Also this round:** deploy workflow gained a `push` trigger on main — GitHub Pages now auto-deploys on every push (was manual-only `workflow_dispatch`, which caused a "site not updating" incident).

## 3. v4.3 — Mood Tags (2026-11-04, complete)

**Problem:** no way to filter rolls by feeling (tease / devoted / cold ...).

**Solution:** `[M: mood]` end-of-line tag + header mood dropdown:
- Fixed mood list: devoted / femdom / tease / shy / cold / jealous (`PRRoll.MOODS`, open schema).
- Selected mood = only mood-tagged + untagged items roll (same safety rule as guards). Never a dead roll.
- Presets carry moods too: `#preset: Name [M: tease]` on import, auto-tag on save, dropdown filters by mood.
- Ask AI requests teach the `[M:]` tag; Edit tab shows purple `[M: x]` lines.

**Phases & gates:**
- **B1 Engine** (parse/filter/tests): DONE, gate passed. Suite 29 -> 35.
- **B2 UI** (dropdown, state, Ask AI, Edit display): DONE, gate passed (mood-import.txt fixture, 15 items).
- **C Presets** (mood on presets): DONE, gate passed. Suite 35 -> 37. One bug found & fixed during gate: mood change did not re-render the preset dropdown (missing `renderAll()` in the handler).
- **D Docs:** README + WORKFLOW-GUIDE synced to v4.3, mood-import.txt added to repo.

## 4. Mobile UI, safety and refactoring (2026-11-09)

- **PRs #12–#15:** UI safety, Edit navigation, Roll composer, mobile accessibility and concise Self-test.
- **PR #16:** In-app Save/Cancel editor for individual slots and keyboard dismissal.
- **PRs #17 and #18:** Stacked feature-branch merges; these did not independently update main.
- **PR #19:** Landed the actual Back/scroll and same-tab draft recovery code on main. Always check the target branch after merging stacked PRs.
- **PR #20:** Verified saves, visible storage failure warnings, protection of unreadable data and strict JSON scene-import validation. User reported phone checks passed.
- **R0:** Audit of all 24 JavaScript modules and documentation.
- **R1 / PR #21:** Shared JSON preset-import helper, adding 4 regression checks (126 to 130 after merge).
- **R2 / PR #22:** Shared download helper for text export and JSON backup.
- **Documentation PR:** Architecture, workflow, history and maintenance handoff updated in a separate docs-only PR.

The UI and PR #20 phone checks passed. R1 and R2 have isolated automated tests but are still awaiting merge and a final phone check.

## 5. Backlog (optional, post-stable)

- Import update-on-tag-match: re-importing "same text + new tag" updates the stored item instead of skipping as duplicate.
- Web Share API button (send exports straight to GitHub/Drive via Android share sheet).
- Extended guard tags (`pose`, `solo`) — only if conflicts still slip through.
- Mood-tagging pass over the existing 247 items (Ask AI round trip or manual) — the filter only bites on tagged items.

## 6. Constraints & rules

- Each JavaScript module stays under 200 lines. Plain HTML/CSS/JS, zero build step, zero dependencies.
- The 24 JS modules load in strict order and register `window.__EOF["<name>"] = true`; `app.js` checks them.
- NSFW vocabulary NEVER in `js/` data files — seeds stay clean; private items via in-app Import / Ask AI + JSON backup only.
- Minors words blocked at parser level, always.
- State lives in localStorage `prompt_roller_v4_state`; JSON backup/restore is the safety net.
- For each change, run regression checks, use one small PR targeting main, and never merge automatically. See MAINTENANCE-HANDOFF.md.

## 7. Related documents

- `prompt-roller-v4/README.md` — current architecture and module load order.
- `prompt-roller-v4/WORKFLOW-GUIDE.md` — current phone workflow and backup guidance.
- `prompt-roller-v4/MAINTENANCE-HANDOFF.md` — current PR/test status and safe maintenance steps.
