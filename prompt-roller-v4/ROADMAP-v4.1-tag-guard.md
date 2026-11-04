# Prompt Roller — Version History & Roadmap (v4.1 guard chain · v4.2 roll modes · v4.3 mood tags)

Status: v4.3 complete — all gates passed. Deployed on GitHub Pages (auto-deploy on push to main).
Last updated: 2026-11-04

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

## 4. Backlog (optional, post-stable)

- Import update-on-tag-match: re-importing "same text + new tag" updates the stored item instead of skipping as duplicate.
- Web Share API button (send exports straight to GitHub/Drive via Android share sheet).
- Extended guard tags (`pose`, `solo`) — only if conflicts still slip through.
- Mood-tagging pass over the existing 247 items (Ask AI round trip or manual) — the filter only bites on tagged items.

## 5. Constraints & rules

- Max 200 lines per file. Plain HTML/CSS/JS, zero build step, zero dependencies.
- Strict load order; every file registers `window.__EOF["<name>"] = true` (14 files).
- NSFW vocabulary NEVER in `js/` data files — seeds stay clean; private items via in-app Import / Ask AI + JSON backup only.
- Minors words blocked at parser level, always.
- State lives in localStorage `prompt_roller_v4_state`; JSON backup/restore is the safety net.
- Working rules for every dev chat: `DEVELOPING-CONTRACT.md` (incl. §9 verify-before-claim & ask-don't-guess).

## 6. Related documents

- `DEVELOPING-CONTRACT.md` — working rules for every development chat
- `prompt-roller-v4/README.md` — architecture, load order, schemas, import format
- `prompt-roller-v4/WORKFLOW-GUIDE.md` — user manual, Ask AI workflow, red-flag rules
- `SKILL-pocket-boot.md` (libraryId 250) — prompt work cheat sheet