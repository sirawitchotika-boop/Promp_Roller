# Prompt Roller v4.3 — Architecture & Technical Manual

> **Coherent scenes update:** Active scene slots are camera, action, light and venue.
> Hands, prop and depth remain stored for old backup compatibility, but are not
> rolled, shown as active slots or included in generated prompts.
> Roll All selects ONE complete scene preset and its linked outfit when available.
> Roll Scene updates only the four scene slots; it leaves Outfit unchanged.
> When Outfit is locked, a scene with conflicting linked clothing is not selected.
> Built-in presets have linked outfit choices. New saved presets also store the outfit.
> Existing imported presets without outfits retain the current outfit.
> If locked slots exclude every preset, the roll leaves the scene unchanged.
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
    ├── data-scene.js     # SEED_SCENE: 4 active scene lists + 3 archived lists
    ├── presets.js        # SEED_PRESETS: 6 SFW scene presets (Spicy presets imported via #preset:)
    ├── engine-roll.js    # PRRoll: roll modes + mood filter + [G:] guard tags + guarded scene roll chain (v4.3)
    ├── engine.js         # PREngine: prompt assembly, {c} interpolation, validation, roll pick (parser delegated)
    ├── import.js         # PRImport: #list:/#preset: import + export line parser (split from engine.js, v4.4)
    ├── backup.js         # PRBackup: validate full-state restore
    ├── test.js           # Base isolated regression tests
    ├── test-preset.js    # Scene preset and lock tests
    ├── test-filter.js    # SFW and mood tests
    ├── test-backup.js    # Archived lists and backup tests
    ├── test-integration.js # Scene and Outfit tests
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

All **20 JavaScript files** load in the order listed in `index.html`. Each sets a `window.__EOF` marker; `app.js` verifies all 20 before startup. Keep the load order and markers.

```text
1–4   data-rules, data-subject, data-scene, presets  -> seed data
5     engine-roll                                  -> filters, presets, tags
6     engine                                       -> prompt and validation
7–8   import, backup                               -> exchange and restore
9–13  test, test-preset, test-filter, test-backup,
      test-integration                             -> 93 regression checks (on demand)
14    ui                                           -> state and roll actions
15    render                                       -> Roll tab display
16    ask                                          -> Edit panel layouts
17–18 editor, editor-io                             -> Edit, import and backup controls
19    hooktail                                     -> editable Hook and Tail
20    app                                          -> startup and controls
```

The tests run when the user taps **Edit → Self-test → Run all tests**, not during normal startup.

---

## 3. Prompt Assembly Order & Data Schema

### Fixed Prompt Build Order (`PREngine.buildPrompt`)

The prompt uses **11 active slots** plus the editable Hook and Tail in this order:
`camera → HOOK → body → hair (hairS + hairC) → eyes → face → skin → action → outfit → light → venue → TAIL`.

Archived Hands, Prop and Depth are not included in active prompts but stay in saved data and text exchange.

### Roll Modes (v4.2) & Mood Filter (v4.3)
One shared pool filter (`PRRoll.filterPool`) feeds every roll path (Roll tab, single-slot dice):
- **SFW:** only clean items (no `x` flag) roll. Spicy presets hidden.
- **NSFW:** only `x`-flagged items roll; a slot with none falls back to its whole pool (never dead).
- **Mix:** the full pool rolls.
- **Mood:** `Any mood` = no filter. A selected mood = only items tagged with it plus all untagged items (same safety rule as guards). Presets follow the same rule; saving a preset while a mood is selected auto-tags it.

### Coherent Scene Presets and Individual Dice

- **Roll All:** rerolls unlocked Subject slots and chooses one complete four-slot scene preset; may update linked Outfit.
- **Scene + Copy:** changes Camera, Action, Light and Venue together; **never changes Outfit**.
- **Subject + Copy:** rerolls Subject slots, leaving scene slots unchanged.
- **Apply Preset:** loads four required scene values, plus linked Outfit when available. A conflicting lock rejects the entire apply.
- **Individual dice:** change only the selected slot, using saved lists plus mode, mood and guard checks.
- **Outfit filtering:** Subject and Roll All rerolls do not reuse a tagged linked Outfit that conflicts with the selected mode or mood. Manual edits and unknown legacy clothing are preserved.
- **Compatibility:** old presets may omit Outfit; archived Hands, Prop and Depth are kept for backup and exchange, but not rolled.

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
- `current` (object): Current values for 11 active slots; older archived keys may also exist.
- `locked` (object): Map of `{ slotId: true }` for locked slots.
- `custom` (object): Map of `{ slotId: true }` when a slot holds a hand-edited custom line.
- `lists` (object): 11 active slot arrays, with optional archived Hands, Prop and Depth lists.
- `presets` (array): Preset objects with four required scene fields, optional Outfit and archived fields; may carry `x` and `m`.
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

- **`#list: <slot>`:** Starts an item section for any of the 11 active or 3 archived slots.
- **`[G: key=value, key=value]`:** Guard tag at end of line.
- **`[M: mood]`:** Mood tag at end of line. `[G:]`, `[M:]` and `[NOTE:]` may appear in any order; export writes them as `[NOTE:] [G:] [M:]`.
- **Malformed tags** (`[G: front]`, `[M:]`, `[guard: ...]`): bracket stripped entirely, item text kept clean.
- **Codeblock fences** (``` lines from AI answers): skipped automatically.
- **`#preset: <name>`:** Starts a preset block with required `camera:`, `action:`, `light:` and `venue:`; optional `outfit:` and archived `hands:`, `prop:` and `depth:` are preserved. `!` means spicy, and `[M: mood]` sets mood. Single-line JSON also works.
- **Single-slot mode:** Select a target slot in the Exchange dropdown and paste plain lines directly (no `#list:` header needed).
- **Safety:** Any line containing a prohibited minors word is strictly blocked at parser level and never enters storage.

### Exchange Panel
One screen for the whole AI round trip, sharing one slot dropdown:
- **Export:** `Copy slot` (clipboard) or `Download .txt` (auto filename `prompt-roller-io-<slot|all>-YYYYMMDD-HHMMSS.txt`). Auto-detect exports all 11 active lists, 3 archived lists and presets.
- **Ask AI:** request builder for the selected slot (count / theme / spicy) — carries format rules, banned words, guard-tag AND mood-tag instructions and 3 style examples.
- **Import:** paste box + `Import file` (.txt/.md) + `Clear box`. Auto-detect mode reads `#list:` headers.
- **Backup / restore:** full-state JSON download (timestamped `prompt-roller-backup-YYYYMMDD-HHMMSS.json`) and file restore. Restoring JSON **replaces** existing saved state after validation; lists-only JSON does **not** merge. Make a full backup first.

---

## 5. Risk-Based Verification

1. **Every code PR:** run the built-in 93-check self-test suite on throwaway data. Confirm the startup badge shows `file complete` (20 scripts).
2. **Visible behavior changes:** check only the affected buttons on a phone. Use one or two short checks instead of a fixed six-step checklist.
3. **Backup and saved-state changes:** download a full JSON backup first; test using disposable data and verify expected values survive.
4. **Docs-only and unused-local cleanup:** no extra human gate is required.

Report pass/fail totals and failures only. Isolated self-tests are not the same as real-device browser checks.
