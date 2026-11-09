# Prompt Roller v4.3 — Architecture & Technical Manual

> **Coherent scenes update:** Active scene slots are camera, action, light and venue.
> Hands, prop and depth remain stored for old backup compatibility, but are not
> rolled, shown as active slots or included in generated prompts.
> A scene roll now selects ONE complete preset and matching outfit when available.
> Built-in presets have linked outfit choices. New saved presets also store the outfit.
> Existing imported presets without outfits retain the current outfit.
> If locked slots exclude every preset, the roll leaves the scene unchanged.
> The legacy architecture below is retained for reference.
>
> **Backup and exchange update:** Exchange → Export All now includes archived
> Hands, Prop and Depth lists, and importing that text restores those inactive
> lists without reactivating the rollers. Use Backup → Download JSON to preserve
> the full state, including locks and current choices. Restore checks the JSON
> structure before replacing data; invalid backup files leave saved data unchanged.

Mobile-first AI Image Prompt Roller.
Designed for 100% offline execution on Android (Spck Editor / Chrome) and static hosting (GitHub Pages, auto-deploy on push to main).

---

## 1. Project File Tree & Module Responsibilities

Rule: **Max 200 lines per file.** Plain HTML/CSS/JS, zero build step, zero external dependencies.

```text
prompt-roller-v4/
├── index.html            # App shell, 2-tab layout, mode segment + mood dropdown, script loader & error catcher
├── style.css             # Dark theme (#14161c), mobile-first UI, 44px touch targets
├── hairS-import.txt      # 30-item hairstyle test fixture (+1 duplicate) for Gate Test 4
├── guard-import.txt      # Guard-tag test fixture (tagged + untagged items) for v4.1 gates
├── mood-import.txt       # Mood-tag test fixture (15 tagged + untagged items) for v4.3 gates
├── README.md             # Technical architecture, dependency graph & gate test manual
├── WORKFLOW-GUIDE.md     # User manual, Exchange workflow & zero-red-flag maintenance guide
├── ROADMAP-v4.1-tag-guard.md  # Version history: v4.1 guard chain, v4.2 roll modes, v4.3 mood tags
└── js/
    ├── data-rules.js     # PR_RULES: Hook, Tail, 18 Minors words, 44 Banned words, 10 Pairing rules
    ├── data-subject.js   # SEED_SUBJECT: 7 subject slot seed arrays (body, hairC, hairS, eyes, skin, face, outfit)
    ├── data-scene.js     # SEED_SCENE: 7 scene slot seed arrays (camera, action, hands, light, prop, venue, depth)
    ├── presets.js        # SEED_PRESETS: 6 SFW scene presets (Spicy presets imported via #preset:)
    ├── engine-roll.js    # PRRoll: roll modes + mood filter + [G:] guard tags + guarded scene roll chain (v4.3)
    ├── engine.js         # PREngine: prompt assembly, {c} interpolation, validation, roll pick (parser delegated)
    ├── import.js         # PRImport: #list:/#preset: import + export line parser (split from engine.js, v4.4)
    ├── test.js           # PRTest: 37-check in-app self-test suite running on isolated mock data
    ├── ui.js             # PRUI: State store (localStorage), roll actions, Lock/Custom slot handlers
    ├── render.js         # PRRender: Roll tab view rendering (split from ui.js, v4.4)
    ├── ask.js            # PRAsk: Exchange panel (export / Ask AI request builder / import), Inventory, Backup, Self-Test panels
    ├── editor.js         # PREdit: Edit tab controller, item search/filter, single add/delete & clear list
    ├── editor-io.js      # PREditIO: Exchange & Backup panel button wiring
    ├── hooktail.js       # PRHookTail: user-editable Hook & Tail lines (saved in state)
    └── app.js            # Watchdog verification, boot badge, tab router, mode/mood/preset bindings
```

---

## 2. Script Load Order & Dependency Graph

Scripts in `index.html` **MUST** load in this exact sequence. Every script registers `window.__EOF["<name>"] = true` at its final line. The watchdog in `app.js` verifies all 15 markers.

```text
[1. data-rules.js]   --> exports window.PR_RULES
[2. data-subject.js] --> exports window.SEED_SUBJECT
[3. data-scene.js]   --> exports window.SEED_SCENE
[4. presets.js]      --> exports window.SEED_PRESETS
[5. engine-roll.js]  --> exports window.PRRoll (modes + moods + guard tags + roll chain)
       │
       ▼
[6. engine.js]       --> uses PR_RULES, PRRoll --> exports window.PREngine
       │
       ├──► [7. import.js]  --> uses PREngine, PRRoll --> exports window.PRImport
       │         (PREngine.parseImport / exportText delegate here at call time)
       │
       ├──► [8. test.js]    --> uses PREngine, PRRoll, PR_RULES --> exports window.PRTest
       │
       ▼
[9. ui.js]           --> uses PREngine, PRRoll, SEED_* --> exports window.PRUI (owns State 'S')
       │
       ├──► [10. render.js] --> uses PREngine, PRUI --> exports window.PRRender
       │         (PRUI.renderAll / renderPrompt / onOutEdit delegate here at call time)
       │
       ├──► [11. ask.js]    --> uses PREngine, PR_RULES, PRRoll, PRUI --> exports window.PRAsk
       └► [12. editor.js]   --> uses PREngine, PRUI, PRAsk --> exports window.PREdit
       │        │
       │        ▼
       │   [13. editor-io.js] --> uses PREngine, PRAsk, PRUI --> exports window.PREditIO
       │
       ▼
[14. hooktail.js]    --> exports window.PRHookTail
       │
       ▼
[15. app.js]         --> Watchdog checks all 15 __EOF markers --> initializes PRUI, PREdit
```

---

## 3. Prompt Assembly Order & Data Schema

### Fixed Prompt Build Order (`PREngine.buildPrompt`)
1. `camera` (First)
2. `HOOK`: `"2.5D semi-realistic illustration, young woman"` (user-editable via Hook & Tail panel)
3. `body`
4. `hair`: `hairS` with `{c}` replaced by `hairC` (or `"{hairS}, her {hairC} hair"` if no `{c}`)
5. `eyes` -> 6. `face` -> 7. `skin` -> 8. `action` -> 9. `outfit` -> 10. `hands` -> 11. `light` -> 12. `prop` -> 13. `venue` -> 14. `depth`
15. `TAIL`: `"No other people, no readable text."` (user-editable, Last)

### Roll Modes (v4.2) & Mood Filter (v4.3)
One shared pool filter (`PRRoll.filterPool`) feeds every roll path (Roll tab, single-slot dice):
- **SFW:** only clean items (no `x` flag) roll. Spicy presets hidden.
- **NSFW:** only `x`-flagged items roll; a slot with none falls back to its whole pool (never dead).
- **Mix:** the full pool rolls.
- **Mood:** `Any mood` = no filter. A selected mood = only items tagged with it plus all untagged items (same safety rule as guards). Presets follow the same rule; saving a preset while a mood is selected auto-tags it.

### Guarded Scene Roll Chain (`PRRoll.rollScene`)
Scene slots roll as a linked chain in fixed order: **venue -> action -> hands -> prop -> light -> depth -> camera**.
- Venue rolls first and sets the guard context (`in`, `day`).
- Every next slot rolls only from items whose guards match the context.
- No match -> falls back to untagged items -> never a dead roll.
- Locked scene slots keep their value AND donate their guards to the context.
- Subject slots stay free dice; `outfit` is guard-aware (follows the scene context).
- Presets bypass the chain entirely (they fill all 7 scene slots directly).

### Item Object Schema
```json
{
  "t": "her {c} hair in a high ponytail",
  "v": 1,
  "x": 1,
  "n": "verified default",
  "g": { "face": "front", "in": "indoor" },
  "m": "tease"
}
```
- `t` (string): Item prompt text.
- `v` (1 | undefined): Verified item flag (shows green dot).
- `x` (1 | undefined): Spicy item flag (shows fire emoji; rolls only in Mix/NSFW modes).
- `n` (string | undefined): Warning or usage note shown in yellow below the item.
- `g` (object | undefined): Guard tags. Keys: `face` (front/rear), `in` (indoor/outdoor), `day` (day/night). Open-ended.
- `m` (string | undefined): Mood tag (devoted / femdom / tease / shy / cold / jealous). Untagged items roll under any mood.

### LocalStorage State Schema (`prompt_roller_v4_state`)
- `mode` ("sfw" | "mix" | "nsfw"): Roll mode. Legacy `spicy` booleans auto-migrate (false -> sfw, true -> mix) then the key is dropped.
- `mood` (string): "any" or one mood word.
- `current` (object): Current active text string for each of the 14 slots.
- `locked` (object): Map of `{ slotId: true }` for locked slots.
- `custom` (object): Map of `{ slotId: true }` when a slot holds a hand-edited custom line.
- `lists` (object): Map of all 14 slot arrays (`body`, `hairC`, etc.).
- `presets` (array): 7-slot scene preset objects; may carry `x` (spicy) and `m` (mood).
- `hook` / `tail` (string): User-edited hook and tail lines.

---

## 4. Import / Export Line Format Specification (`#list:` & `#preset:`)

Parser lives in `js/import.js` (`PRImport`); the public API stays on `PREngine.parseImport` / `PREngine.exportText`.

```text
#list: hairS
her {c} hair in a french twist
!spicy item example
*verified item example
!*spicy and verified item [NOTE: front-facing camera only]
*guarded item example [G: in=indoor, day=night]
mood-tagged item example [M: tease]
full stack example [NOTE: keep] [G: in=indoor] [M: devoted]
// comment line (ignored)
1. numbered item (numbering auto-stripped)
```

- **`#list: <slot>`:** Starts an item section for any of the 14 slots.
- **`[G: key=value, key=value]`:** Guard tag at end of line.
- **`[M: mood]`:** Mood tag at end of line. `[G:]`, `[M:]` and `[NOTE:]` may appear in any order; export writes them as `[NOTE:] [G:] [M:]`.
- **Malformed tags** (`[G: front]`, `[M:]`, `[guard: ...]`): bracket stripped entirely, item text kept clean.
- **Codeblock fences** (``` lines from AI answers): skipped automatically.
- **`#preset: <name>`:** Starts a 7-slot scene preset block (`camera:`, `action:`, `hands:`, `light:`, `prop:`, `venue:`, `depth:`). Modifiers: `!` prefix = spicy, `[M: mood]` suffix = mood tag (e.g. `#preset: !Night club [M: tease]`). Also supports single-line JSON.
- **Single-slot mode:** Select a target slot in the Exchange dropdown and paste plain lines directly (no `#list:` header needed).
- **Safety:** Any line containing a prohibited minors word is strictly blocked at parser level and never enters storage.

### Exchange Panel
One screen for the whole AI round trip, sharing one slot dropdown:
- **Export:** `Copy slot` (clipboard) or `Download .txt` (auto filename `prompt-roller-io-<slot|all>-YYYYMMDD-HHMMSS.txt`). Auto-detect = all 14 slots + presets.
- **Ask AI:** request builder for the selected slot (count / theme / spicy) — carries format rules, banned words, guard-tag AND mood-tag instructions and 3 style examples.
- **Import:** paste box + `Import file` (.txt/.md) + `Clear box`. Auto-detect mode reads `#list:` headers.
- **Backup / restore:** full-state JSON download (timestamped `prompt-roller-backup-YYYYMMDD-HHMMSS.json`) and file restore (partial JSON with only `lists` merges safely).

---

## 5. Gate Test (6-Step Verification)

1. **Boot Badge:** Open `index.html` -> top header shows green `file complete`, no red banner (15 files verified).
2. **Zero-Minors Block:** Tap any slot text on the Roll tab -> type `"a teen girl"` -> blocked immediately with alert naming `"teen"`.
3. **Roll, Copy & Lock:** Tap `Roll all + copy` -> toast shows `rolled + copied`. Tap `Lock` on any slot -> button turns yellow `LOCKED` -> value stays fixed on next roll.
4. **Fixture Imports:** Edit tab -> Exchange -> Auto-detect -> paste `hairS-import.txt` -> `Added 30 - skipped 1 duplicates - 0 bad - 0 blocked - box cleared`. Same flow with `mood-import.txt` -> `Added 15 - skipped 0 duplicates - 0 bad - 0 blocked - box cleared`.
5. **Mode & Mood:** Set mode NSFW -> rolls draw spicy items only. Set mood Cold -> differently-tagged items and presets never appear; untagged ones still roll.
6. **Self-Test Suite:** Edit tab -> Self-test (dev) -> `Run all tests` -> shows `37 / 37 passed` with timestamp.