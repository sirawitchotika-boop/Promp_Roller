// js/engine-roll.js - Roll Modes + Guard Tags + Guarded Scene Roll Chain (v4.2)
(function(){
  var CHAIN = ["venue", "action", "hands", "prop", "light", "depth", "camera"];

  // Roll-mode pool filter (single source of truth for every roll path).
  // "sfw" = clean items only · "nsfw" = x-flagged only · "mix" = everything.
  // Empty result falls back to the whole pool - never a dead roll.
  // Legacy booleans map: true -> "mix", false -> "sfw" (old spicy toggle).
  function filterPool(pool, mode){
    if(!pool || !pool.length) return [];
    if(mode === true) mode = "mix"; else if(mode === false) mode = "sfw";
    var el;
    if(mode === "nsfw"){ el = pool.filter(function(it){ return it.x; }); if(!el.length) el = pool.slice(); }
    else if(mode === "sfw"){ el = pool.filter(function(it){ return !it.x; }); if(!el.length) el = pool.slice(); }
    else el = pool.slice();
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
  // Mode filter -> guard filter -> untagged fallback -> anything. Never dead.
  function pickGuarded(pool, mode, ctx){
    var eligible = filterPool(pool, mode);
    if(!eligible.length) return null;
    var match = eligible.filter(function(it){ return guardMatches(it.g, ctx); });
    if(match.length) return match[Math.floor(Math.random() * match.length)];
    var untagged = eligible.filter(function(it){ return !it.g; });
    var rest = untagged.length ? untagged : eligible;
    return rest[Math.floor(Math.random() * rest.length)];
  }
  // Locked scene slots stay fixed and donate their guards to the context.
  function rollScene(lists, mode, locked, current){
    var ctx = {}, vals = {};
    CHAIN.forEach(function(slot){
      if(locked && locked[slot]){
        vals[slot] = (current && current[slot]) || "";
        mergeGuards(ctx, itemGuards((lists || {})[slot], vals[slot]));
      }
    });
    CHAIN.forEach(function(slot){
      if(locked && locked[slot]) return;
      var pick = pickGuarded((lists || {})[slot], mode, ctx);
      vals[slot] = pick ? pick.t : "";
      if(pick) mergeGuards(ctx, pick.g);
    });
    return { vals: vals, ctx: ctx };
  }

  window.PRRoll = {
    CHAIN: CHAIN, filterPool: filterPool, parseGuard: parseGuard, stripBadGuard: stripBadGuard, guardText: guardText,
    guardMatches: guardMatches, pickGuarded: pickGuarded, ctxFromCurrent: ctxFromCurrent, rollScene: rollScene
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["engine-roll"] = true;
})();
// EOF-engine-roll.js