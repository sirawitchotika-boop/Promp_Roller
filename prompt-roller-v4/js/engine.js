// js/engine.js - Core Engine (Build, Roll, Rules, Storage, Import/Export + #preset: + [G:] guard tags)
(function(){
  var R = window.PR_RULES;
  var SLOTS_SUBJECT = ["body", "hairC", "hairS", "eyes", "skin", "face", "outfit"];
  var SLOTS_SCENE = ["camera", "action", "hands", "light", "prop", "venue", "depth"];
  var ALL_SLOTS = SLOTS_SUBJECT.concat(SLOTS_SCENE);
  var Engine = {
    SLOTS_SUBJECT: SLOTS_SUBJECT,
    SLOTS_SCENE: SLOTS_SCENE,
    ALL_SLOTS: ALL_SLOTS,
    checkMinors: function(text){
      if(!text) return null;
      var str = String(text).toLowerCase();
      for(var i = 0; i < R.MINORS.length; i++){
        var m = R.MINORS[i];
        var re = new RegExp("(?:^|\\W)" + m.replace(/ /g, "\\s+") + "(?:$|\\W)", "i");
        if(re.test(str)) return m;
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
        (cur.outfit || "").trim(), (cur.hands || "").trim(), (cur.light || "").trim(),
        (cur.prop || "").trim(), (cur.venue || "").trim(), (cur.depth || "").trim(), R.TAIL
      ];
      return order.filter(function(p){ return p && p.length > 0; }).join(", ");
    },
    validate: function(current, fullPrompt){
      var warns = [], cur = current || {}, prompt = fullPrompt || this.buildPrompt(cur);
      var pLower = prompt.toLowerCase();
      R.BANNED.forEach(function(b){
        var re = new RegExp("(?:^|\\W)" + b[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:$|\\W)", "i");
        if(re.test(pLower)) warns.push("⚠️ Banned word '" + b[0] + "': " + b[1]);
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
    pickSlot: function(pool, allowSpicy){
      if(!pool || !pool.length) return "";
      var eligible = pool.filter(function(it){ return allowSpicy || !it.x; });
      if(!eligible.length) eligible = pool;
      var idx = Math.floor(Math.random() * eligible.length);
      return eligible[idx] ? eligible[idx].t : "";
    },
    parseImport: function(text, defaultSlot, existingLists, existingPresets){
      var lines = (text || "").split(/\r?\n/);
      var curList = defaultSlot || null, curPreset = null, inPresetsBlock = false;
      var added = 0, duplicates = 0, bad = 0, blocked = 0, presetsAdded = 0;
      var itemsByList = {}, presets = [], seen = {}, seenPresets = {};
      if(existingLists){
        Object.keys(existingLists).forEach(function(k){
          (existingLists[k] || []).forEach(function(it){
            seen[k.toLowerCase() + "::" + String(it.t||"").toLowerCase().replace(/\s+/g," ").trim()] = true;
          });
        });
      }
      if(existingPresets){
        existingPresets.forEach(function(p){
          if(p && p.name) seenPresets[p.name.toLowerCase().trim()] = true;
        });
      }
      if(curList) itemsByList[curList] = [];
      for(var i = 0; i < lines.length; i++){
        var line = lines[i].trim();
        if(!line || line.startsWith("//")) continue;
        var mPreset = line.match(/^(!?)#presets?:\s*(.*)$/i);
        if(mPreset){
          curList = null;
          var pRest = mPreset[2].trim();
          if(!pRest){ inPresetsBlock = true; curPreset = null; continue; }
          inPresetsBlock = false;
          if(this.checkMinors(pRest)){ blocked++; curPreset = null; continue; }
          if(pRest.startsWith("{")){
            try {
              var pj = JSON.parse(pRest.replace(/,$/, ""));
              if(pj && pj.name && pj.values){
                var pk = pj.name.toLowerCase().trim();
                if(seenPresets[pk]){ duplicates++; }
                else { seenPresets[pk] = true; presets.push(pj); presetsAdded++; }
              }
            } catch(e){ bad++; }
            curPreset = null; continue;
          }
          var pSpicy = (mPreset[1] === "!") || pRest.startsWith("!");
          var pName = pRest.replace(/^[!*]+/, "").trim();
          var pk2 = pName.toLowerCase();
          if(seenPresets[pk2]){ duplicates++; curPreset = null; continue; }
          seenPresets[pk2] = true;
          curPreset = { name: pName, values: {} };
          if(pSpicy) curPreset.x = 1;
          presets.push(curPreset); presetsAdded++;
          continue;
        }
        var mHeader = line.match(/^#list:\s*([a-zA-Z_]+)\s*$/i);
        if(mHeader){
          curPreset = null; inPresetsBlock = false;
          var rawName = mHeader[1].toLowerCase(), matched = null;
          for(var sIdx = 0; sIdx < ALL_SLOTS.length; sIdx++){
            if(ALL_SLOTS[sIdx].toLowerCase() === rawName){ matched = ALL_SLOTS[sIdx]; break; }
          }
          curList = matched;
          if(!matched) bad++;
          else if(!itemsByList[curList]) itemsByList[curList] = [];
          continue;
        }
        if(inPresetsBlock && line.startsWith("{")){
          if(this.checkMinors(line)){ blocked++; continue; }
          try {
            var pj2 = JSON.parse(line.replace(/,$/, ""));
            if(pj2 && pj2.name && pj2.values){
              var pk3 = pj2.name.toLowerCase().trim();
              if(seenPresets[pk3]) duplicates++;
              else { seenPresets[pk3] = true; presets.push(pj2); presetsAdded++; }
            }
          } catch(e){ bad++; }
          continue;
        }
        if(curPreset){
          if(this.checkMinors(line)){ blocked++; continue; }
          var mKv = line.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
          if(mKv){
            var sKey = mKv[1].toLowerCase().trim(), sVal = mKv[2].trim();
            SLOTS_SCENE.forEach(function(sc){ if(sc.toLowerCase() === sKey) curPreset.values[sc] = sVal; });
          }
          continue;
        }
        if(!curList) continue;
        if(line.length > 2000){ bad++; continue; }
        if(this.checkMinors(line)){ blocked++; continue; }
        var clean = line.replace(/^\d+[.)]\s*/, "").replace(/^[-\u2022]\s*/, "");
        var spicy = false, verified = false;
        while(clean.startsWith("!") || clean.startsWith("*")){
          if(clean.startsWith("!")) spicy = true; else verified = true;
          clean = clean.substring(1).trim();
        }
        if(!clean){ bad++; continue; }
        var gr = PRRoll.parseGuard(clean);
        if(gr) clean = gr.text;
        var note = "", mNote = clean.match(/\[NOTE:\s*(.*?)\]$/i);
        if(mNote){ note = mNote[1].trim(); clean = clean.replace(/\[NOTE:\s*.*?\]$/i, "").trim(); }
        var key = curList.toLowerCase() + "::" + clean.toLowerCase().replace(/\s+/g, " ").trim();
        if(seen[key]){ duplicates++; continue; }
        seen[key] = true;
        if(!itemsByList[curList]) itemsByList[curList] = [];
        itemsByList[curList].push({ t: clean, x: spicy ? 1 : undefined, v: verified ? 1 : undefined, n: note || undefined, g: gr && gr.g ? gr.g : undefined });
        added++;
      }
      return {
        added: added, presetsAdded: presetsAdded, duplicates: duplicates, bad: bad, blocked: blocked,
        itemsByList: itemsByList, presets: presets,
        clean: (added + presetsAdded) > 0 && bad === 0 && blocked === 0
      };
    },
    exportText: function(lists, singleSlot, presets){
      var out = [], keys = singleSlot ? [singleSlot] : ALL_SLOTS;
      keys.forEach(function(k){
        out.push("#list: " + k);
        (lists[k] || []).forEach(function(it){
          out.push((it.x ? "!" : "") + (it.v ? "*" : "") + it.t + (it.n ? " [NOTE: " + it.n + "]" : "") + (it.g ? PRRoll.guardText(it.g) : ""));
        });
        out.push("");
      });
      if(!singleSlot && Array.isArray(presets) && presets.length){
        presets.forEach(function(p){
          out.push("#preset: " + (p.x ? "!" : "") + p.name);
          SLOTS_SCENE.forEach(function(sc){
            if(p.values && p.values[sc]) out.push(sc + ": " + p.values[sc]);
          });
          out.push("");
        });
      }
      return out.join("\n");
    }
  };
  window.PREngine = Engine;
  window.__EOF = window.__EOF || {};
  window.__EOF["engine"] = true;
})();
// EOF-engine.js