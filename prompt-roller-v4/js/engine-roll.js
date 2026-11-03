// js/engine-roll.js - Guard Tags + Guarded Scene Roll Chain (v4.1 Phase 1+2)
(function(){
  var CHAIN = ["venue", "action", "hands", "prop", "light", "depth", "camera"];

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
  // Spicy filter -> guard filter -> untagged fallback -> anything. Never dead.
  function pickGuarded(pool, allowSpicy, ctx){
    var eligible = (pool || []).filter(function(it){ return allowSpicy || !it.x; });
    if(!eligible.length) eligible = (pool || []).slice();
    if(!eligible.length) return null;
    var match = eligible.filter(function(it){ return guardMatches(it.g, ctx); });
    if(match.length) return match[Math.floor(Math.random() * match.length)];
    var untagged = eligible.filter(function(it){ return !it.g; });
    var rest = untagged.length ? untagged : eligible;
    return rest[Math.floor(Math.random() * rest.length)];
  }
  // Locked scene slots stay fixed and donate their guards to the context.
  // Returns { vals: slot->text, ctx: rolled guard context }.
  function rollScene(lists, allowSpicy, locked, current){
    var ctx = {}, vals = {};
    CHAIN.forEach(function(slot){
      if(locked && locked[slot]){
        vals[slot] = (current && current[slot]) || "";
        mergeGuards(ctx, itemGuards((lists || {})[slot], vals[slot]));
      }
    });
    CHAIN.forEach(function(slot){
      if(locked && locked[slot]) return;
      var pick = pickGuarded((lists || {})[slot], allowSpicy, ctx);
      vals[slot] = pick ? pick.t : "";
      if(pick) mergeGuards(ctx, pick.g);
    });
    return { vals: vals, ctx: ctx };
  }

  window.PRRoll = {
    CHAIN: CHAIN, parseGuard: parseGuard, guardText: guardText, guardMatches: guardMatches,
    pickGuarded: pickGuarded, ctxFromCurrent: ctxFromCurrent, rollScene: rollScene
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["engine-roll"] = true;
})();
// EOF-engine-roll.js