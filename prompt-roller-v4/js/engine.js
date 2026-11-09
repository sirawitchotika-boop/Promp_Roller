// js/engine.js - Core Engine (Build, Validate, Pick; import/export parser lives in js/import.js)
(function(){
  var R = window.PR_RULES;
  // Hot-path regexes compiled ONCE at load.
  var MINORS_RE = R.MINORS.map(function(m){ return new RegExp("(?:^|\\W)" + m.replace(/ /g, "\\s+") + "(?:$|\\W)", "i"); });
  var BANNED_RE = R.BANNED.map(function(b){ return { re: new RegExp("(?:^|\\W)" + b[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:$|\\W)", "i"), w: b[0], why: b[1] }; });
  var SLOTS_SUBJECT = ["body", "hairC", "hairS", "eyes", "skin", "face", "outfit"];
  var SLOTS_SCENE = ["camera", "action", "light", "venue"]; // coherent linked scenes
  var ALL_SLOTS = SLOTS_SUBJECT.concat(SLOTS_SCENE);
  var Engine = {
    SLOTS_SUBJECT: SLOTS_SUBJECT,
    SLOTS_SCENE: SLOTS_SCENE,
    ALL_SLOTS: ALL_SLOTS,
    checkMinors: function(text){
      if(!text) return null;
      var str = String(text).toLowerCase();
      for(var i = 0; i < MINORS_RE.length; i++){
        if(MINORS_RE[i].test(str)) return R.MINORS[i];
      }
      return null;
    },
    hairText: function(hairS, hairC){
      var hs = (hairS || "").trim(), hc = (hairC || "").trim();
      if(!hs) return hc ? "her " + hc + " hair" : "";
      if(hs.includes("{c}")) return hs.replace(/\{c\}/g, hc || "");
      return hc ? hs + ", her " + hc + " hair" : hs;
    },
    buildPrompt: function(current){
      var cur = current || {};
      var order = [
        (cur.camera || "").trim(), R.HOOK, (cur.body || "").trim(),
        this.hairText(cur.hairS, cur.hairC), (cur.eyes || "").trim(),
        (cur.face || "").trim(), (cur.skin || "").trim(), (cur.action || "").trim(),
        (cur.outfit || "").trim(), (cur.light || "").trim(),
        (cur.venue || "").trim(), R.TAIL
      ];
      return order.filter(function(p){ return p && p.length > 0; }).join(", ");
    },
    validate: function(current, fullPrompt){
      var warns = [], cur = current || {}, prompt = fullPrompt || this.buildPrompt(cur);
      var pLower = prompt.toLowerCase();
      BANNED_RE.forEach(function(b){
        if(b.re.test(pLower)) warns.push("⚠️ Banned word '" + b.w + "': " + b.why);
      });
      var cObj = {
        outfit: (cur.outfit||"").toLowerCase(), camera: (cur.camera||"").toLowerCase(),
        action: (cur.action||"").toLowerCase(), venue: (cur.venue||"").toLowerCase()
      };
      R.PAIRING_RULES.forEach(function(r){
        try { if(r.check(cObj, prompt)) warns.push("⚠️ Pairing (" + r.id + "): " + r.msg); } catch(e){}
      });
      return warns;
    },
    pickSlot: function(pool, mode, mood){
      var el = PRRoll.filterPool(pool, mode, mood);
      if(!el.length) return "";
      var idx = Math.floor(Math.random() * el.length);
      return el[idx] ? el[idx].t : "";
    },
    // Parser delegated to js/import.js (v4.4 Day 3) - public API unchanged.
    parseImport: function(text, defaultSlot, existingLists, existingPresets){
      return PRImport.parse(text, defaultSlot, existingLists, existingPresets);
    },
    exportText: function(lists, singleSlot, presets){
      return PRImport.exportText(lists, singleSlot, presets);
    }
  };
  window.PREngine = Engine;
  window.__EOF = window.__EOF || {};
  window.__EOF["engine"] = true;
})();
// EOF-engine.js