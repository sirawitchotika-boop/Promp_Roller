# Prompt Roller v4 — Architecture & Technical Manual

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
├── README.md             # Technical architecture, dependency graph & gate test manual
├── WORKFLOW-GUIDE.md     # User manual, Ask AI workflow & zero-red-flag maintenance guide
└── js/
    ├── data-rules.js     # PR_RULES: Hook, Tail, 18 Minors words, 44 Banned words, 10 Pairing rules
    ├── data-subject.js   # SEED_SUBJECT: 7 subject slot seed arrays (body, hairC, hairS, eyes, skin, face, outfit)
    ├── data-scene.js     # SEED_SCENE: 7 scene slot seed arrays (camera, action, hands, light, prop, venue, depth)
    ├── presets.js        # SEED_PRESETS: 6 SFW scene presets (Spicy imported via #preset:)
    ├── engine.js         # PREngine: Prompt assembly order, {c} interpolation, validation, import/export parser
    ├── test.js           # PRTest: 15-check in-app self-test suite running on isolated mock data
    ├── ui.js             # PRUI: State store (localStorage), Roll tab rendering, Lock/Custom slot handlers
    ├── batch.js          # PRBatch: 10-card Batch roller (unique hair/eyes) & Saved Prompt Library
    ├── ask.js            # PRAsk: External AI Request Builder, Inventory Overview, IO & Backup sub-panels
    ├── editor.js         # PREdit: Edit tab controller, item search/filter, single add/delete & clear list
    └── app.js            # Watchdog verification, boot badge, tab router & top-level button bindings
```

---

## 2. Script Load Order & Dependency Graph

Scripts in `index.html` **MUST** load in this exact sequence. Every script registers `window.__EOF["<name>"] = true` at its final line.

```text
[1. data-rules.js]   --> exports window.PR_RULES
[2. data-subject.js] --> exports window.SEED_SUBJECT
[3. data-scene.js]   --> exports window.SEED_SCENE
[4. presets.js]      --> exports window.SEED_PRESETS
       │
       ▼
[5. engine.js]       --> uses PR_RULES --> exports window.PREngine
       │
       ├──► [6. test.js]   --> uses PREngine, PR_RULES --> exports window.PRTest
       │
       ▼
[7. ui.js]           --> uses PREngine, SEED_* --> exports window.PRUI (owns State 'S')
       │
       ├──► [8. batch.js]  --> uses PREngine, PRUI --> exports window.PRBatch
       ├──► [9. ask.js]    --> uses PREngine, PR_RULES, PRUI --> exports window.PRAsk
       └──► [10. editor.js]--> uses PREngine, PRUI, PRAsk --> exports window.PREdit
               │
               ▼
[11. app.js]         --> Watchdog checks all 10 __EOF markers --> initializes PRUI, PRBatch, PREdit
```

---

## 3. Prompt Assembly Order & Data Schema

### Fixed Prompt Build Order (`PREngine.buildPrompt`)
1. `camera` (First)
2. `HOOK`: `"2.5D semi-realistic illustration, young woman"`
3. `body`
4. `hair`: `hairS` with `{c}` replaced by `hairC` (or `"{hairS}, her {hairC} hair"` if no `{c}`)
5. `eyes` -> 6. `face` -> 7. `skin` -> 8. `action` -> 9. `outfit` -> 10. `hands` -> 11. `light` -> 12. `prop` -> 13. `venue` -> 14. `depth`
15. `TAIL`: `"No other people, no readable text."` (Last)

### Item Object Schema
```json
{
  "t": "her {c} hair in a high ponytail",
  "v": 1,
  "x": 1,
  "n": "verified default"
}
```
- `t` (string): Item prompt text.
- `v` (1 | undefined): Verified item flag (shows green dot `●`).
- `x` (1 | undefined): Spicy item flag (shows `🔥`, excluded from rolls when Spicy toggle is OFF).
- `n` (string | undefined): Warning or usage note shown in yellow below the item.

### LocalStorage State Schema (`prompt_roller_v4_state`)
- `spicy` (boolean): Spicy roll toggle state.
- `current` (object): Current active text string for each of the 14 slots.
- `locked` (object): Map of `{ slotId: true }` for locked slots.
- `custom` (object): Map of `{ slotId: true }` when a slot holds a hand-edited custom line.
- `lists` (object): Map of all 14 slot arrays (`body`, `hairC`, etc.).
- `presets` (array): Array of 7-slot scene preset objects.
- `library` (array): Saved prompts (`{ id, ts, name, values, text }`).

---

## 4. Import / Export Line Format Specification (`#list:` & `#preset:`)

```text
#list: hairS
her {c} hair in a french twist
!spicy item example
*verified item example
!*spicy and verified item [NOTE: front-facing camera only]
// comment line (ignored)
1. numbered item (numbering auto-stripped)

#preset: !Under-sheet POV
camera: View from under the bedsheets...
action: she is lowering her hips...
hands: her left hand pressing flat...
light: warm lamp glow...
prop: her clothes piled on the floor...
venue: in a night bedroom
depth: the far door a soft blur...
```
- **`#list: <slot>`:** Starts an item section for any of the 14 slots.
- **`#preset: <name>` (or `#preset: !<name>` for spicy):** Starts a 7-slot scene preset block (`camera:`, `action:`, `hands:`, `light:`, `prop:`, `venue:`, `depth:`). Also supports single-line JSON (`#preset: {"name":"...", "x":1, "values":{...}}`).
- **Single-slot mode:** Select a target slot in the dropdown and paste plain lines directly (no `#list:` header needed).
- **Safety:** Any line containing a prohibited minors word is strictly blocked at parser level and never enters storage.

---

## 5. Gate Test (5-Step Verification)

1. **Boot Badge:** Open `index.html` -> top header shows green **`✓ file complete`**, no red banner.
2. **Zero-Minors Block:** Tap any slot text on the Roll tab -> type `"a teen girl"` -> blocked immediately with alert naming `"teen"`.
3. **Roll, Copy & Lock:** Tap `🎲 Roll all + copy` -> toast shows `rolled + copied`. Tap `Lock` on any slot -> button turns yellow `LOCKED` -> value stays fixed on next roll.
4. **Fixture Import:** Go to `Edit` tab -> select `Import / Export (text)` -> paste `hairS-import.txt` -> tap `📥 Import lines` -> result reads:
   `Added 30 - skipped 1 duplicates - 0 bad - 0 blocked - box cleared`
5. **Self-Test Suite:** Go to `Edit` tab -> select `Self-test (dev)` -> tap `▶ Run all tests` -> shows **`✓ 15 / 15 passed`** with timestamp.
