# Prompt Roller v4.1 — Architecture & Technical Manual

Mobile-first AI Image Prompt Roller, Batch Generator & Inventory Manager.
Designed for 100% offline execution on Android (Spck Editor / Chrome) and static hosting (Cloudflare Pages).

---

## 1. Project File Tree & Module Responsibilities

Rule: **Max 200 lines per file.** Plain HTML/CSS/JS, zero build step, zero external dependencies.

```text
prompt-roller-v4/
├── index.html            # App shell, 4-tab layout, script loader & error catcher
├── style.css             # Dark theme (#14161c), mobile-first responsive UI
├── hairS-import.txt      # 30-item hairstyle test fixture (+1 duplicate) for Gate Test 4
├── guard-import.txt      # Guard-tag test fixture (tagged + untagged items) for v4.1 gates
├── README.md             # Technical architecture, dependency graph & gate test manual
├── WORKFLOW-GUIDE.md     # User manual, Ask AI workflow & zero-red-flag maintenance guide
└── js/
    ├── data-rules.js     # PR_RULES: Hook, Tail, 18 Minors words, 44 Banned words, 10 Pairing rules
    ├── data-subject.js   # SEED_SUBJECT: 7 subject slot seed arrays (body, hairC, hairS, eyes, skin, face, outfit)
    ├── data-scene.js     # SEED_SCENE: 7 scene slot seed arrays (camera, action, hands, light, prop, venue, depth)
    ├── presets.js        # SEED_PRESETS: 6 SFW scene presets (Spicy imported via #preset:)
    ├── engine-roll.js     # PRRoll: [G:] guard tag parse/format, guarded scene roll chain (v4.1)
    ├── engine.js         # PREngine: Prompt assembly order, {c} interpolation, validation, import/export parser
    ├── test.js           # PRTest: 25-check in-app self-test suite running on isolated mock data
    ├── ui.js             # PRUI: State store (localStorage), Roll tab rendering, Lock/Custom slot handlers
    ├── batch.js          # PRBatch: 10-card Batch roller (unique hair/eyes) & Saved Prompt Library
    ├── ask.js            # PRAsk: External AI Request Builder, Inventory Overview, IO & Backup sub-panels
    ├── editor.js         # PREdit: Edit tab controller, item search/filter, single add/delete & clear list
    ├── hooktail.js       # PRHookTail: user-editable Hook & Tail lines (saved in state)
    └── app.js            # Watchdog verification, boot badge, tab router & top-level button bindings
```

---

## 2. Script Load Order & Dependency Graph

Scripts in `index.html` **MUST** load in this exact sequence. Every script registers `window.__EOF["<name>"] = true` at its final line. The watchdog in `app.js` verifies all 13 markers.

```text
[1. data-rules.js]   --> exports window.PR_RULES
[2. data-subject.js] --> exports window.SEED_SUBJECT
[3. data-scene.js]   --> exports window.SEED_SCENE
[4. presets.js]      --> exports window.SEED_PRESETS
[5. engine-roll.js]  --> exports window.PRRoll (guard tags + roll chain)
       │
       ▼
[6. engine.js]       --> uses PR_RULES, PRRoll --> exports window.PREngine
       │
       ├──► [7. test.js]   --> uses PREngine, PRRoll, PR_RULES --> exports window.PRTest
       │
       ▼
[8. ui.js]           --> uses PREngine, PRRoll, SEED_* --> exports window.PRUI (owns State 'S')
       │
       ├──► [9. batch.js]  --> uses PREngine, PRRoll, PRUI --> exports window.PRBatch
       ├──► [10. ask.js]   --> uses PREngine, PR_RULES, PRUI --> exports window.PRAsk
       └──► [11. editor.js]--> uses PREngine, PRUI, PRAsk --> exports window.PREdit
               │
               ▼
[12. hooktail.js]    --> exports window.PRHookTail
       │
       ▼
[13. app.js]         --> Watchdog checks all 13 __EOF markers --> initializes PRUI, PRBatch, PREdit
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

### Guarded Scene Roll Chain (`PRRoll.rollScene`, v4.1)
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
  "g": { "face": "front", "in": "indoor" }
}
```
- `t` (string): Item prompt text.
- `v` (1 | undefined): Verified item flag (shows green dot).
- `x` (1 | undefined): Spicy item flag (shows fire emoji, excluded from rolls when Spicy toggle is OFF).
- `n` (string | undefined): Warning or usage note shown in yellow below the item.
- `g` (object | undefined): Guard tags. Keys: `face` (front/rear), `in` (indoor/outdoor), `day` (day/night). Open-ended - new keys can be added without code changes.

### LocalStorage State Schema (`prompt_roller_v4_state`)
- `spicy` (boolean): Spicy roll toggle state.
- `current` (object): Current active text string for each of the 14 slots.
- `locked` (object): Map of `{ slotId: true }` for locked slots.
- `custom` (object): Map of `{ slotId: true }` when a slot holds a hand-edited custom line.
- `lists` (object): Map of all 14 slot arrays (`body`, `hairC`, etc.).
- `presets` (array): Array of 7-slot scene preset objects.
- `library` (array): Saved prompts (`{ id, ts, name, values, text }`).
- `hook` / `tail` (string): User-edited hook and tail lines.

---

## 4. Import / Export Line Format Specification (`#list:` & `#preset:`)

```text
#list: hairS
her {c} hair in a french twist
!spicy item example
*verified item example
!*spicy and verified item [NOTE: front-facing camera only]
*guarded item example [G: in=indoor, day=night]
// comment line (ignored)
1. numbered item (numbering auto-stripped)
```

- **`#list: <slot>`:** Starts an item section for any of the 14 slots.
- **`[G: key=value, key=value]`:** Guard tag at end of line. Parsed BEFORE `[NOTE:]`, exported AFTER it.
- **Malformed guards** (`[G: front]`, `[guard: ...]`): bracket stripped entirely, item text kept clean.
- **Codeblock fences** (``` lines from AI answers): skipped automatically.
- **`#preset: <name>` (or `#preset: !<name>` for spicy):** Starts a 7-slot scene preset block (`camera:`, `action:`, `hands:`, `light:`, `prop:`, `venue:`, `depth:`). Also supports single-line JSON (`#preset: {"name":"...", "x":1, "values":{...}}`).
- **Single-slot mode:** Select a target slot in the dropdown and paste plain lines directly (no `#list:` header needed).
- **Safety:** Any line containing a prohibited minors word is strictly blocked at parser level and never enters storage.

### Hybrid IO (v4.1)
- **Import:** paste lines into the box, or `Import file` (.txt/.md) to load a file into the box first.
- **Export:** `Download .txt` - one tap, auto filename `prompt-roller-io-<slot|all>-YYYYMMDD-HHMMSS.txt`.
- **Backup / restore:** full-state JSON download and file restore (partial JSON with only `lists` merges safely).

---

## 5. Gate Test (5-Step Verification)

1. **Boot Badge:** Open `index.html` -> top header shows green `file complete`, no red banner (13 files verified).
2. **Zero-Minors Block:** Tap any slot text on the Roll tab -> type `"a teen girl"` -> blocked immediately with alert naming `"teen"`.
3. **Roll, Copy & Lock:** Tap `Roll all + copy` -> toast shows `rolled + copied`. Tap `Lock` on any slot -> button turns yellow `LOCKED` -> value stays fixed on next roll.
4. **Fixture Import:** Edit tab -> Import / Export (text) -> Auto-detect -> paste `hairS-import.txt` -> `Import lines` -> result reads `Added 30 - skipped 1 duplicates - 0 bad - 0 blocked - box cleared`.
5. **Self-Test Suite:** Edit tab -> Self-test (dev) -> `Run all tests` -> shows `25 / 25 passed` with timestamp.