// js/import.js - Import/Export Line Parser (split from engine.js, v4.4 Day 3)
// Depends on: PREngine (checkMinors, slot lists) + PRRoll (tag parsing) - both loaded earlier.
(function(){
  var E = window.PREngine;
  // Retired scene slots stay in old backups; never silently drop them on export/import.
  var EXCHANGE_SLOTS = E.ALL_SLOTS.concat(["hands", "prop", "depth"]);
  function validJsonPreset(p){
    // Use the same legacy-compatible safety checks as backup restore.
    return !!window.PRBackup && PRBackup.verify({
      lists: { body: [] }, presets: [p]
    }).ok;
  }

  // #list: / #preset: / [G:] / [M:] / [NOTE:] line format -> item + preset objects.
  function parse(text, defaultSlot, existingLists, existingPresets){
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
      if(/^(\u0060{3,}|~~~)/.test(line)) continue;
      var mPreset = line.match(/^(!?)#presets?:\s*(.*)$/i);
      if(mPreset){
        curList = null;
        var pRest = mPreset[2].trim();
        if(!pRest){ inPresetsBlock = true; curPreset = null; continue; }
        inPresetsBlock = false;
        if(E.checkMinors(pRest)){ blocked++; curPreset = null; continue; }
        if(pRest.startsWith("{")){
          try {
            var pj = JSON.parse(pRest.replace(/,$/, ""));
            if(validJsonPreset(pj)){
              var pk = pj.name.toLowerCase().trim();
              if(seenPresets[pk]){ duplicates++; }
              else { seenPresets[pk] = true; presets.push(pj); presetsAdded++; }
            } else bad++;
          } catch(e){ bad++; }
          curPreset = null; continue;
        }
        var pSpicy = (mPreset[1] === "!") || pRest.startsWith("!");
        var pName = pRest.replace(/^[!*]+/, "").trim();
        var pMood = PRRoll.parseMood(pName);
        if(pMood) pName = pMood.text; else pName = PRRoll.stripBadMood(pName);
        if(!pName){ bad++; curPreset = null; continue; }
        var pk2 = pName.toLowerCase();
        if(seenPresets[pk2]){ duplicates++; curPreset = null; continue; }
        seenPresets[pk2] = true;
        curPreset = { name: pName, values: {} };
        if(pSpicy) curPreset.x = 1;
        if(pMood) curPreset.m = pMood.m;
        presets.push(curPreset); presetsAdded++;
        continue;
      }
      var mHeader = line.match(/^#list:\s*([a-zA-Z_]+)\s*$/i);
      if(mHeader){
        curPreset = null; inPresetsBlock = false;
        var rawName = mHeader[1].toLowerCase(), matched = null;
        for(var sIdx = 0; sIdx < EXCHANGE_SLOTS.length; sIdx++){
          if(EXCHANGE_SLOTS[sIdx].toLowerCase() === rawName){ matched = EXCHANGE_SLOTS[sIdx]; break; }
        }
        curList = matched;
        if(!matched) bad++;
        else if(!itemsByList[curList]) itemsByList[curList] = [];
        continue;
      }
      if(inPresetsBlock && line.startsWith("{")){
        if(E.checkMinors(line)){ blocked++; continue; }
        try {
          var pj2 = JSON.parse(line.replace(/,$/, ""));
          if(validJsonPreset(pj2)){
            var pk3 = pj2.name.toLowerCase().trim();
            if(seenPresets[pk3]) duplicates++;
            else { seenPresets[pk3] = true; presets.push(pj2); presetsAdded++; }
          } else bad++;
        } catch(e){ bad++; }
        continue;
      }
      if(curPreset){
        if(E.checkMinors(line)){ blocked++; continue; }
        var mKv = line.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
        if(mKv){
          var sKey = mKv[1].toLowerCase().trim(), sVal = mKv[2].trim();
          // Keep legacy fields for import/export compatibility.
          E.SLOTS_SCENE.concat(["hands", "prop", "depth", "outfit"]).forEach(function(sc){
            if(sc.toLowerCase() === sKey) curPreset.values[sc] = sVal;
          });
        }
        continue;
      }
      if(!curList) continue;
      if(line.length > 2000){ bad++; continue; }
      if(E.checkMinors(line)){ blocked++; continue; }
      var clean = line.replace(/^\d+[.)]\s*/, "").replace(/^[-\u2022]\s*/, "");
      var spicy = false, verified = false;
      while(clean.startsWith("!") || clean.startsWith("*")){
        if(clean.startsWith("!")) spicy = true; else verified = true;
        clean = clean.substring(1).trim();
      }
      if(!clean){ bad++; continue; }
      var tg = PRRoll.parseTags(clean);
      clean = tg.text;
      var note = "", mNote = clean.match(/\[NOTE:\s*(.*?)\]$/i);
      if(mNote){ note = mNote[1].trim(); clean = clean.replace(/\[NOTE:\s*.*?\]$/i, "").trim(); }
      var key = curList.toLowerCase() + "::" + clean.toLowerCase().replace(/\s+/g, " ").trim();
      if(seen[key]){ duplicates++; continue; }
      seen[key] = true;
      if(!itemsByList[curList]) itemsByList[curList] = [];
      itemsByList[curList].push({ t: clean, x: spicy ? 1 : undefined, v: verified ? 1 : undefined, n: note || undefined, g: tg.g || undefined, m: tg.m || undefined });
      added++;
    }
    return {
      added: added, presetsAdded: presetsAdded, duplicates: duplicates, bad: bad, blocked: blocked,
      itemsByList: itemsByList, presets: presets,
      clean: (added + presetsAdded) > 0 && bad === 0 && blocked === 0
    };
  }

  // Lists + presets -> #list: / #preset: text (round-trips with parse).
  function exportText(lists, singleSlot, presets){
    var out = [], keys = singleSlot ? [singleSlot] : EXCHANGE_SLOTS;
    keys.forEach(function(k){
      out.push("#list: " + k);
      (lists[k] || []).forEach(function(it){
        out.push((it.x ? "!" : "") + (it.v ? "*" : "") + it.t + (it.n ? " [NOTE: " + it.n + "]" : "") + (it.g ? PRRoll.guardText(it.g) : "") + (it.m ? " [M: " + it.m + "]" : ""));
      });
      out.push("");
    });
    if(!singleSlot && Array.isArray(presets) && presets.length){
      presets.forEach(function(p){
        out.push("#preset: " + (p.x ? "!" : "") + p.name + (p.m ? " [M: " + p.m + "]" : ""));
        E.SLOTS_SCENE.concat(["hands", "prop", "depth", "outfit"]).forEach(function(sc){
          if(p.values && p.values[sc]) out.push(sc + ": " + p.values[sc]);
        });
        out.push("");
      });
    }
    return out.join("\n");
  }

  window.PRImport = { parse: parse, exportText: exportText };
  window.__EOF = window.__EOF || {};
  window.__EOF["import"] = true;
})();
// EOF-import.js