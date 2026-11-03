// js/engine-roll.js - Guard Tag module: parse/format [G: key=value] markers (v4.1 Phase 1)
// Phase 2 will add the guarded roll chain in this same file. Loads BEFORE engine.js.
(function(){
  // "[G: face=rear, in=indoor]" at end of line -> { g: {face:"rear", in:"indoor"}, text: line without the tag }
  // Returns null when the line has no valid guard tag.
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
  // { face: "rear" } -> " [G: face=rear]" (for export; appended AFTER any [NOTE:])
  function guardText(g){
    if(!g) return "";
    var keys = Object.keys(g);
    if(!keys.length) return "";
    return " [G: " + keys.map(function(k){ return k + "=" + g[k]; }).join(", ") + "]";
  }
  // True when the item's guard agrees with the context guards rolled so far.
  // Untagged items (g = null/empty) always match. Used by the Phase 2 roll chain.
  function guardMatches(g, ctx){
    if(!g) return true;
    var keys = Object.keys(g);
    for(var i = 0; i < keys.length; i++){
      if(ctx && ctx[keys[i]] && ctx[keys[i]] !== g[keys[i]]) return false;
    }
    return true;
  }
  window.PRRoll = { parseGuard: parseGuard, guardText: guardText, guardMatches: guardMatches };
  window.__EOF = window.__EOF || {};
  window.__EOF["engine-roll"] = true;
})();
// EOF-engine-roll.js