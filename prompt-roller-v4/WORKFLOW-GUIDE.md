# Prompt Roller v4.3 — Complete User & Workflow Guide

> **Coherent scenes update:** The scene roller now selects one complete
> venue/action/light/camera preset instead of independently mixing scene fragments.
> Hands, prop and depth are not active rollers or included in prompt output.
> Built-in presets select matching outfits; saved presets include current outfits.
> Older custom presets without outfits retain current clothing.
> Existing backups are preserved. Conflicting locks can prevent a scene
> preset from applying. Scene + Copy leaves Outfit unchanged.

Mobile app manual (Spck Editor / Chrome) and the external-AI vocabulary workflow that never triggers red flags.

---

## 1. The 2 Main Tabs

### Tab 1: `Roll` (random prompt assembly)
- **Roll mode (SFW / Mix / NSFW):** 3 buttons at the top.
  - `SFW`: only clean items roll. Spicy presets hidden.
  - `Mix`: everything rolls (clean + spicy).
  - `NSFW`: spicy (`!`) items are preferred; when none exist, clean items may be used.
- **Mood dropdown:** `Any mood` = no filter. Pick a mood (Devoted / Femdom / Tease / Shy / Cold / Jealous) = only items tagged with that mood plus all untagged items roll. Presets follow the same rule.
- **3 main roll buttons:**
  - `Roll all + copy`: rerolls unlocked Subject slots, chooses a complete scene, and may update linked Outfit.
  - `Subject + copy`: rerolls only the 7 character slots, scene stays.
  - `Scene + copy`: selects one complete preset for Camera, Action, Light and Venue; does not change Outfit.
- **Prompt Output box:**
  - Hand-edit freely (banned words are auto-checked).
  - `Copy` to copy, or `Rebuild` to reassemble from the 11 active slots after hand edits.
- **Scene Presets:** pick a preset and `Apply` to load the four linked scene slots and its Outfit when allowed by locks. Type a name and `Save current scene` to store it; the selected mood becomes its tag.
- **Using the 11 active slots:**
  - **Tap a slot's text:** opens a box to type or paste custom text (shows a purple `CUSTOM` badge; empty + confirm = slot cleared).
  - **`Lock` / `LOCKED`:** keeps that value during rolls. A conflicting lock can reject an entire preset.
  - **`dice` button:** rerolls that single slot (guard-aware for scene slots and outfit; respects mode + mood).

### Tab 2: `Edit` (vocabulary & system tools)
Dropdown options:
1. **11 active vocabulary lists:** live item counts in the dropdown. Search filters (first 50 shown). Tap an item to expand and read its blue `[G:]` guard line, purple `[M:]` mood line and yellow note. `+ Add item` (leading `!` = spicy, `*` = verified, trailing `[G: in=indoor]` = guard, `[M: tease]` = mood). `Clear all` wipes the list (with confirm).
2. **Exchange (export / Ask AI / import):** ONE screen for the whole AI round trip, sharing one slot dropdown:
   - **Export:** `Copy slot` to clipboard, or `Download .txt` with an auto date-time filename. Auto-detect = all 11 active lists, 3 archived lists and presets.
   - **Ask AI:** pick count, optional theme, spicy checkbox → `Copy request` → paste into ChatGPT / Claude / any AI. The request teaches the AI to write `[G:]` guard tags and `[M:]` mood tags itself. (Needs a specific slot, not Auto-detect.)
   - **Import:** paste the AI answer codeblock (or any `#list:` text) into the box, or `Import file` to load a .txt first. `Import lines` parses everything. `Clear box` wipes the box in one tap.
3. **Scene presets:** view, Apply, or delete presets. Mood-tagged presets show a purple `[M: x]` label.
4. **Inventory overview:** totals per slot — items, verified, spicy — with jump-to-edit buttons.
5. **Backup / restore:** download the full state as .json, restore from a file, or factory reset. Restore replaces the saved state after validation; a lists-only JSON does **not** merge. Keep a full backup first.
6. **Hook & tail:** edit the fixed head/tail lines of every prompt. Saved in state, survives updates and backups.
7. **Self-test (dev):** one tap runs the 87-check suite on throwaway data, once per tap.

---

## 2. Guard Tags (v4.1) — how the app avoids nonsense combos

- An item can end with a guard tag: `[G: in=indoor]`, `[G: face=front]`, `[G: in=outdoor, day=day]`.
- Meaning: "this item only fits that situation." Individual slot dice use guard tags to avoid conflicting choices. Main scene rolls select complete presets instead of the old guard chain.
- **Untagged = fits anywhere.** When in doubt, leave an item untagged — a missing tag is safe, a wrong tag hides a good item.
- Keys in use: `in` (indoor/outdoor), `day` (day/night), `face` (front/rear). More can be added later without code changes.
- Tags are visible as blue `[G: ...]` lines in the Edit tab for easy review.

---

## 3. Mood Tags (v4.3) — filtering by feeling

- An item can end with a mood tag: `[M: tease]`, `[M: devoted]`, `[M: cold]`, `[M: shy]`, `[M: femdom]`, `[M: jealous]`.
- Meaning: "this item carries that feeling." Pick a mood in the header and every roll (items AND presets) skips differently-tagged entries.
- **Untagged = fits any mood.** Most items stay untagged; tag only the ones with a strong, unmistakable feeling.
- Presets: add `[M: mood]` after the name on import (`#preset: Night club [M: tease]`), or just save while a mood is selected.
- Tags are visible as purple `[M: ...]` lines in the Edit tab.

---

## 4. Iron rules for keeping this project red-flag free

1. **Never embed adult (NSFW) vocabulary inside the `.js` files in `js/`:**
   - `js/data-subject.js` and `js/data-scene.js` always contain only clean, standard vocabulary.
2. **Private vocabulary lives in the app only, via Import + JSON backup:**
   - Add spicy items through the web app (Exchange panel), then `Download backup (.json)` to keep a copy on your phone.
   - When you need Gemini, Claude, or any AI to upgrade features or fix bugs, you can share the full `.html / .css / .js` code set with 100% safety — no safety-system blocks, ever.  