// js/backup.js - Validate backup data before changing the live application state.
(function(){
  function record(v){ return !!v && typeof v === "object" && !Array.isArray(v); }
  function safeKeys(v, depth){
    if(depth > 20) return false;
    if(!v || typeof v !== "object") return true;
    return Object.keys(v).every(function(k){
      return k !== "__proto__" && k !== "constructor" && k !== "prototype" &&
        safeKeys(v[k], depth + 1);
    });
  }
  function stringMap(v){
    return record(v) && Object.keys(v).every(function(k){ return typeof v[k] === "string"; });
  }
  function booleanMap(v){
    return record(v) && Object.keys(v).every(function(k){ return typeof v[k] === "boolean"; });
  }
  function verify(raw){
    if(!record(raw) || !safeKeys(raw, 0))
      return { ok: false, error: "Backup format is invalid" };
    if(!record(raw.lists) || !Object.keys(raw.lists).length)
      return { ok: false, error: "Backup has no usable lists" };
    var listsOK = Object.keys(raw.lists).every(function(k){
      return Array.isArray(raw.lists[k]) && raw.lists[k].every(function(it){
        return record(it) && typeof it.t === "string" &&
          (it.m === undefined || typeof it.m === "string") &&
          (it.n === undefined || typeof it.n === "string") &&
          (it.g === undefined || stringMap(it.g));
      });
    });
    if(!listsOK) return { ok: false, error: "Backup has invalid list items" };
    if(raw.current !== undefined && !stringMap(raw.current))
      return { ok: false, error: "Backup has invalid slot values" };
    if(raw.locked !== undefined && !booleanMap(raw.locked))
      return { ok: false, error: "Backup has invalid locks" };
    if(raw.custom !== undefined && !booleanMap(raw.custom))
      return { ok: false, error: "Backup has invalid custom markers" };
    var presets = raw.presets === undefined ? [] : raw.presets;
    if(!Array.isArray(presets) || !presets.every(function(p){
      return record(p) && typeof p.name === "string" && p.name.trim() &&
        stringMap(p.values);
    })) return { ok: false, error: "Backup has invalid scene presets" };
    if((raw.hook !== undefined && typeof raw.hook !== "string") ||
       (raw.tail !== undefined && typeof raw.tail !== "string") ||
       (raw.sceneOutfit !== undefined && typeof raw.sceneOutfit !== "string") ||
       (raw.mood !== undefined && typeof raw.mood !== "string"))
      return { ok: false, error: "Backup has invalid settings" };
    var mode = ["sfw", "nsfw", "mix"].indexOf(raw.mode) >= 0 ?
      raw.mode : (raw.spicy === false ? "sfw" : "mix");
    var normalized = {
      mode: mode, mood: raw.mood || "any", lists: raw.lists,
      current: raw.current || {}, locked: raw.locked || {},
      custom: raw.custom || {}, presets: presets,
      sceneOutfit: raw.sceneOutfit !== undefined ? raw.sceneOutfit :
        ((raw.current && raw.current.outfit) || "")
    };
    if(raw.hook !== undefined) normalized.hook = raw.hook;
    if(raw.tail !== undefined) normalized.tail = raw.tail;
    return { ok: true, state: normalized };
  }
  function restore(raw, target){
    var check = verify(raw);
    if(!check.ok) return check; // Invalid files never alter the current state.
    var next = JSON.parse(JSON.stringify(check.state));
    Object.keys(target).forEach(function(k){ delete target[k]; });
    Object.keys(next).forEach(function(k){ target[k] = next[k]; });
    return { ok: true };
  }
  window.PRBackup = { verify: verify, restore: restore };
  window.__EOF = window.__EOF || {};
  window.__EOF["backup"] = true;
})();
// EOF-backup.js
