# Prompt Roller v4.1 — Complete User & Workflow Guide

Mobile app manual (Spck Editor / Chrome) and the external-AI vocabulary workflow that never triggers red flags.

---

## 1. The 3 Main Tabs

### Tab 1: `Roll` (random prompt assembly)
- **Spicy items (ON/OFF):** switch at top right. OFF = all fire-marked items are skipped in every roll.
- **3 main roll buttons:**
  - `Roll all + copy`: rerolls all 14 slots (locked slots stay) and copies the prompt.
  - `Subject + copy`: rerolls only the 7 character slots, scene stays.
  - `Scene + copy`: rerolls only the 7 scene slots — these roll as a **guard chain** (venue first, the rest follow its context), so combos stay coherent.
- **Prompt Output box:**
  - Hand-edit freely (banned words are auto-checked).
  - `Copy` to copy, or `Rebuild` to reassemble from the 14 slots after hand edits.
- **Scene Presets:** pick a preset from the dropdown and `Apply` to fill all 7 scene slots at once. Type a name and `Save current scene` to store the current scene as a new preset.
- **Using the 14 slots:**
  - **Tap a slot's text:** opens a box to type or paste custom text (shows a purple `CUSTOM` badge; empty + confirm = slot cleared).
  - **`Lock` / `LOCKED`:** freezes that slot during rolls. Locked scene slots also feed their guard tags into the chain.
  - **`dice` button:** rerolls that single slot (guard-aware for scene slots and outfit).

### Tab 2: `Batch` (10 prompts at once)
- `Rotate all (10)`: 10 prompts, guaranteed unique hair color, hairstyle and eye color per set. Every card rolls its own coherent guard chain.
- `Subject only (10)`: keeps the current scene, rerolls only the characters.
- Browse cards with `Prev / Next`, tap text to expand, `Copy #N` per card or `Copy all 10` for the whole set. The QA line at the bottom lists which cards carry warnings.

### Tab 3: `Edit` (vocabulary & system tools)
Dropdown options:
1. **14 vocabulary lists:** live item counts in the dropdown. Search filters (first 50 shown). Tap an item to expand and read its blue `[G:]` guard line and yellow note. `+ Add item` (leading `!` = spicy, `*` = verified, trailing `[G: in=indoor]` = guard). `Clear all` wipes the list (with confirm).
2. **Exchange (export / Ask AI / import):** ONE screen for the whole AI round trip, sharing one slot dropdown:
   - **Export:** `Copy slot` to clipboard, or `Download .txt` with an auto date-time filename. Auto-detect = all 14 slots + presets.
   - **Ask AI:** pick count, optional theme, spicy checkbox → `Copy request` → paste into ChatGPT / Claude / any AI. The request teaches the AI to write `[G:]` guard tags itself. (Needs a specific slot, not Auto-detect.)
   - **Import:** paste the AI answer codeblock (or any `#list:` text) into the box, or `Import file` to load a .txt first. `Import lines` parses everything. `Clear box` wipes the box in one tap.
3. **Scene presets:** view, Apply, or delete presets.
4. **Inventory overview:** totals per slot — items, verified, spicy — with jump-to-edit buttons.
5. **Backup / restore:** download the full state as .json, restore from a file, or factory reset. A partial JSON containing only `lists` merges safely (everything else untouched).
6. **Hook & tail:** edit the fixed head/tail lines of every prompt. Saved in state, survives updates and backups.
7. **Self-test (dev):** one tap runs the 25-check suite on throwaway data.

---

## 2. Guard Tags (v4.1) — how the app avoids nonsense combos

- An item can end with a guard tag: `[G: in=indoor]`, `[G: face=front]`, `[G: in=outdoor, day=day]`.
- Meaning: "this item only fits that situation." The roll chain reads the tags and never mixes conflicting items (no more office outfit at the beach, no ribbon top with a rear camera).
- **Untagged = fits anywhere.** When in doubt, leave an item untagged — a missing tag is safe, a wrong tag hides a good item.
- Keys in use: `in` (indoor/outdoor), `day` (day/night), `face` (front/rear). More can be added later without code changes.
- Tags are visible as blue `[G: ...]` lines in the Edit tab for easy review.

---

## 3. Iron rules for keeping this project red-flag free

1. **Never embed adult (NSFW) vocabulary inside the `.js` files in `js/`:**
   - `js/data-subject.js` and `js/data-scene.js` always contain only clean, standard vocabulary.
2. **Private vocabulary lives in the app only, via Import + JSON backup:**
   - Add spicy items through the web app (Exchange panel), then `Download backup (.json)` to keep a copy on your phone.
   - When you need Gemini, Claude, or any AI to upgrade features or fix bugs, you can share the full `.html / .css / .js` code set with 100% safety — no safety-system blocks, ever.