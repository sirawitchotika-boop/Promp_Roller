// js/engine-roll.js - Roll Modes + Mood Tags + Guard Tags + Scene Roll Chain (v4.3)
(function(){
  var CHAIN = ["venue", "action", "light", "camera"];
  var MOODS = ["devoted", "femdom", "tease", "shy", "cold", "jealous"];

  // Roll-mode + mood pool filter (single source of truth for every roll path).
  // mode: "sfw" = clean only · "nsfw" = x-flagged only · "mix" = all (legacy true/false -> mix/sfw).
  // mood: falsy or "any" = no filter · else keep mood-tagged + untagged items.
  // Empty mood result falls back to the mode-filtered pool - never a dead roll.
  function filterPool(pool, mode, mood){
    if(!pool || !pool.length) return [];
    if(mode === true) mode = "mix"; else if(mode === false) mode = "sfw";
    var el;
    if(mode === "nsfw"){ el = pool.filter(function(it){ return it.x; }); if(!el.length) el = pool.slice(); }
    else if(mode === "sfw"){ el = pool.filter(function(it){ return !it.x; }); if(!el.length) el = pool.slice(); }
    else el = pool.slice();
    if(mood && mood !== "any"){
      var mo = el.filter(function(it){ return !it.m || it.m === mood; });
      if(mo.length) el = mo;
    }
    return el;
  }

  // "[G: face=rear, in=indoor]" at end of line -> { g: {...}, text: line without the tag }
  function parseGuard(text){
    var s = String(text || "");
    var m = s.match(/\[G:\s*([^\]]+)\]\s*$/i);
    if(!m) return null;
    var g = {};
    m[1].split(",").forEach(function(pair){
      var kv = pair.split("=");
      var k = kv[0].trim().toLowerCase(), v = kv[1] ? kv[1].trim().toLowerCase() : "";
      if(k && v) g[k] = v;
    });
    if(!Object.keys(g).length) return null;
    return { g: g, text: s.replace(/\[G:\s*[^\]]+\]\s*$/i, "").trim() };
  }
  // Malformed guard brackets ([G: front], [guard: face=front]) get stripped entirely
  // so they never leak into prompt text as junk. Returns cleaned text.
  function stripBadGuard(text){
    var s = String(text || "");
    if(!/\[\s*g(?:uard)?\s*:/i.test(s)) return s;
    return s.replace(/\[\s*g(?:uard)?\s*:[^\]]*\]/gi, "").replace(/\s{2,}/g, " ").trim();
  }
  // "[M: tease]" at end of line -> { m: "tease", text: line without the tag }
  function parseMood(text){
    var s = String(text || "");
    var m = s.match(/\[M:\s*([a-z0-9-]+)\]\s*$/i);
    if(!m) return null;
    return { m: m[1].toLowerCase(), text: s.replace(/\[M:\s*[a-z0-9-]+\]\s*$/i, "").trim() };
  }
  // Malformed mood brackets ([M:], [mood: x]) stripped so they never leak into prompt text.
  function stripBadMood(text){
    var s = String(text || "");
    if(!/\[\s*m(?:ood)?\s*:/i.test(s)) return s;
    return s.replace(/\[\s*m(?:ood)?\s*:[^\]]*\]/gi, "").replace(/\s{2,}/g, " ").trim();
  }
  // Parse [M:] + [G:] tags from the end of a line, in any order.
  // Returns { m, g, text } - malformed brackets stripped, text always clean.
  function parseTags(text){
    var s = String(text || ""), m, g;
    var mm = parseMood(s);
    if(mm){ m = mm.m; s = mm.text; }
    var gg = parseGuard(s);
    if(gg){ g = gg.g; s = gg.text; }
    var mm2 = parseMood(s);
    if(mm2 && !m){ m = mm2.m; s = mm2.text; }
    s = stripBadMood(s);
    s = stripBadGuard(s);
    return { m: m, g: g, text: s };
  }
  // { face: "rear" } -> " [G: face=rear]" (export; appended AFTER any [NOTE:])
  function guardText(g){
    if(!g) return "";
    var keys = Object.keys(g);
    if(!keys.length) return "";
    return " [G: " + keys.map(function(k){ return k + "=" + g[k]; }).join(", ") + "]";
  }
  // Untagged items always match. Tagged items fail only when a ctx key conflicts.
  function guardMatches(g, ctx){
    if(!g) return true;
    var keys = Object.keys(g);
    for(var i = 0; i < keys.length; i++){
      if(ctx && ctx[keys[i]] && ctx[keys[i]] !== g[keys[i]]) return false;
    }
    return true;
  }
  function mergeGuards(ctx, g){
    if(!g) return;
    Object.keys(g).forEach(function(k){ if(!ctx[k]) ctx[k] = g[k]; });
  }
  function itemGuards(pool, text){
    for(var i = 0; i < (pool || []).length; i++){
      if(pool[i].t === text && pool[i].g) return pool[i].g;
    }
    return null;
  }
  // Context read from what is currently on the board (for single-slot rerolls).
  function ctxFromCurrent(lists, current){
    var ctx = {};
    CHAIN.forEach(function(slot){
      mergeGuards(ctx, itemGuards((lists || {})[slot], (current || {})[slot]));
    });
    return ctx;
  }
  // Mode + mood filter -> guard filter -> untagged fallback -> anything. Never dead.
  function pickGuarded(pool, mode, ctx, mood){
    var eligible = filterPool(pool, mode, mood);
    if(!eligible.length) return null;
    var match = eligible.filter(function(it){ return guardMatches(it.g, ctx); });
    if(match.length) return match[Math.floor(Math.random() * match.length)];
    var untagged = eligible.filter(function(it){ return !it.g; });
    var rest = untagged.length ? untagged : eligible;
    return rest[Math.floor(Math.random() * rest.length)];
  }
  // Roll one complete preset, never unrelated scene fragments.
  // Older presets without an outfit retain the existing outfit.
  var DEFAULT_OUTFITS = {
    "Rooftop laundry (SFW)": "a loose white t-shirt knotted at her waist, denim shorts, bare feet",
    "Midnight kitchen (SFW)": "a thin white tank top and grey sweatpants rolled at the waist",
    "Rain bus stop (SFW)": "a thin beige trench coat over a black turtleneck, wet from rain",
    "Gym chalk (SFW)": "a black sports bra and short shorts, white chalk dust on her hands",
    "Pool edge": "a blue one-piece swimsuit",
    "Rooftop bar night": "a simple black evening dress with flat shoes"
  };
  function rollScene(lists, mode, locked, current, mood, presets){
    var options = filterPool(presets || [], mode, mood).filter(function(p){
      return p && p.values && CHAIN.every(function(slot){
        return typeof p.values[slot] === "string" && !!p.values[slot].trim() &&
          (!locked || !locked[slot] || p.values[slot] === ((current && current[slot]) || ""));
      });
    });
    var picked = options.length ? options[Math.floor(Math.random() * options.length)] : null;
    var ctx = {}, vals = {};
    CHAIN.forEach(function(slot){
      vals[slot] = (locked && locked[slot]) || !picked ?
        ((current && current[slot]) || "") : picked.values[slot];
      mergeGuards(ctx, itemGuards((lists || {})[slot], vals[slot]));
    });
    return { vals: vals, ctx: ctx, matched: !!picked,
      outfit: picked ? (picked.values.outfit || DEFAULT_OUTFITS[picked.name] || "") : "" };
  }

  window.PRRoll = {
    CHAIN: CHAIN, MOODS: MOODS, filterPool: filterPool, parseGuard: parseGuard, stripBadGuard: stripBadGuard,
    parseMood: parseMood, stripBadMood: stripBadMood, parseTags: parseTags, guardText: guardText,
    guardMatches: guardMatches, pickGuarded: pickGuarded, ctxFromCurrent: ctxFromCurrent, rollScene: rollScene,
    DEFAULT_OUTFITS: DEFAULT_OUTFITS
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["engine-roll"] = true;
})();
// EOF-engine-roll.js