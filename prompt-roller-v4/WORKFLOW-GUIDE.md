# Prompt Roller v4 — User & Workflow Guide

> **Coherent scenes update:** The scene roller now selects one complete
> venue/action/light/camera preset instead of independently mixing scene fragments.
> Hands, prop and depth are not active rollers or included in prompt output.
> Built-in presets select matching outfits; saved presets include current outfits.
> Older custom presets without outfits retain current clothing.
> Existing backups are preserved. Conflicting locks can prevent a scene
> preset from applying. Scene + Copy leaves Outfit unchanged.

Mobile browser guide and external-AI vocabulary workflow. Keep personal backups private.

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
  - `Subject + copy`: rerolls only the 7 character slots; the scene stays. A linked Outfit is replaced only if its saved tags conflict with the selected mode or mood.
  - `Scene + copy`: selects one complete preset for Camera, Action, Light and Venue; does not change Outfit.
- **Prompt Output box:**
  - Hand-edit freely. Edited drafts can survive refresh in the same tab if the generated prompt still matches.
  - **Copy prompt** copies the text; **Rebuild from slots** replaces hand edits after confirmation.
- **Scene presets:** choose a scene and tap **Apply scene**. Enter a name and tap **Save scene** to create a preset. Locks and selected mood still apply.
- **Using the 11 active slots:**
  - **Tap a slot's value:** opens the dark in-app editor. **Save changes** saves; **Cancel** discards; saving empty text clears the slot. Both dismiss the keyboard.
  - **`Lock` / `LOCKED`:** keeps that value during rolls. A conflicting lock can reject an entire preset.
  - **`dice` button:** rerolls that single slot (guard-aware for scene slots and outfit; respects mode + mood).

### Tab 2: `Edit` (vocabulary and tools)

Four top buttons organize the Edit view:

- **Vocabulary:** Choose an active list, search or add items, and use Delete/Clear all with confirmation.
- **Scenes:** View, Apply or Delete saved scenes; deletions ask first.
- **Exchange:** Export text, create Ask AI requests and import from pasted text or file. Both `#preset:` JSON and JSON lines under `#presets:` are validated before saving.
- **Tools:** Inventory, Hook & Tail, Backup and Self-test. Exporting text or JSON uses the same download behavior after the R2 cleanup.

**Backup and saved data:** Download a full JSON backup before restoring or factory reset. Restoring replaces saved state after validation, not a merge. If saving fails, the app shows a visible warning; if existing storage is unreadable, original bytes are protected and can be downloaded for recovery.

**Android Back:** Back from Edit can return to Roll. Back from Roll may exit the browser directly; an exit prompt is best-effort and not guaranteed.

**Self-test:** Shows a pass/fail summary first. The main branch had 126 checks after PR #20. R1 adds four, making 130 after R1 is merged and deployed.

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