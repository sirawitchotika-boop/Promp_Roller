# Prompt Roller v4.1 — Tag-Guard Roll System (Executive Summary & Roadmap)

Status: Phase 5 delivered — pending Gate 3. Phases 0-4 passed.
Last updated: 2026-11-03

---

## 1. Problem

Rolling all 14 slots as independent dice produces conflicting prompts (example: man in a necktie on a car, library background). Root cause: scene slots (action, hands, prop, venue, camera) each secretly assume their own mini-scene, so independent rolls fight each other. Subject slots (hair, eyes, body, skin, face) are pure descriptors and never conflict.

## 2. Solution (chosen: Option B — tag-guard roll chain)

- Items gain an optional `g` (guard) field: `{"t": "...", "v": 1, "g": {"face": "rear", "in": "indoor"}}`
- Scene slots roll as a linked chain in fixed order: **venue -> action -> hands -> prop -> light -> depth -> camera**
- Each roll filters candidates by guards already rolled. No match -> fall back to untagged items (never a dead roll).
- Untagged items = always safe, roll freely. Fully backward compatible.
- Subject slots stay free dice; outfit is guard-aware. Presets bypass the chain.

## 3. Decisions (agreed with Boss)

| Topic | Decision |
|---|---|
| Tag vocabulary | Minimal 3 keys now: `face`, `in`, `day`. Schema open-ended — `pose`, `solo` later without code changes. |
| Code placement | `js/engine-roll.js` (guard tags + roll chain). `engine.js` only gained 2 hardening lines. |
| Hands slot | New action items carry their own hands wording. Hands slot stays for universal-safe items. Slot never deleted. |
| Import syntax | `[G: key=value]` suffix; malformed brackets stripped; codeblock fences skipped. |
| Data tagging | Done via partial-JSON restore (`restore-tagged.json`, lists only) — deduped + tagged in one pass. |
| IO design | Hybrid: export = one-tap dated .txt download; import = paste box + file picker + clear button. |
| Code quality | No lazy code. Optimized, near-zero technical debt. Full-file deliveries only. |
| Docs language | 100% English everywhere (Boss standing order 2026-10-31). |

## 4. Phases (all numbering from 0)

- **Phase 0 — Prep:** DONE. Backup, tag vocabulary locked.
- **Phase 1 — Schema + parser:** DONE, Gate 1 passed. `[G:]` survives text import/export + JSON backup/restore.
- **Phase 2 — Engine pipeline:** DONE, Gate 2 passed. Roll chain in `engine-roll.js`, wired into Roll tab + Batch. Watchdog 13 markers. Hybrid IO included.
- **Phase 3 — UI + Ask AI:** DONE (bundled early). Tags visible in Edit tab; Ask AI builder requests tagged output.
- **Phase 4 — Data tagging:** DONE. All 14 lists deduped + tagged via `restore-tagged.json` (247 items, porcelain dropped).
- **Phase 5 — Self-test + docs + hardening:** DELIVERED. Suite 20 -> 25 checks (guard parse/filter/fallback, fence skip, malformed-guard strip). README + WORKFLOW-GUIDE rewritten. Pending Gate 3.
- **Phase 6 — Backlog (optional, post-stable):**
  - Import update-on-tag-match: re-importing "same text + new tag" updates the stored item instead of skipping as duplicate (kills the need for JSON handoffs in future re-tagging rounds).
  - Web Share API button (send exports straight to GitHub/Drive via Android share sheet).
  - Extended tags (`pose`, `solo`) — only if conflicts still slip through.
- **Phase 7 — Pre-stable review (planned):** Boss brings the latest full file set -> full code review: fix issues, cut redundant features, small UI/UX polish. Then deploy (Cloudflare Pages).

## 5. Gate tests (human = Boss, on phone)

- **Gate 1 (Phase 1): PASSED** — fixture import/export round trip, tags intact.
- **Gate 2 (Phase 2): PASSED** — no mismatched combos, untagged items still roll, boot badge green.
- **Gate 4 verify (Phase 4): PASSED** — restore, counts 247, tags visible, roll checks clean.
- **Gate 3 (Phase 5, PENDING):** 1) Self-test 25/25. 2) Batch of 10 -> human read -> zero scene chaos. 3) Ask AI round trip: request -> external AI -> paste answer -> tags import correctly, no junk lines.

## 6. Constraints & rules

- Max 200 lines per file. Plain HTML/CSS/JS, zero build step, zero dependencies.
- Strict load order; every file registers `window.__EOF["<name>"] = true` (13 files).
- NSFW vocabulary NEVER in `js/` data files — seeds stay clean; private items via in-app Import / Ask AI + JSON backup only.
- Minors words blocked at parser level, always.
- State lives in localStorage `prompt_roller_v4_state`; JSON backup/restore is the safety net.

## 7. Related documents

- `DEVELOPING-CONTRACT.md` — working rules for every development chat
- `prompt-roller-v4/README.md` — architecture, load order, schemas, import format
- `prompt-roller-v4/WORKFLOW-GUIDE.md` — user manual, Ask AI workflow, red-flag rules
- `SKILL-pocket-boot.md` (libraryId 250) — prompt work cheat sheet