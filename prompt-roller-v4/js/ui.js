// js/ui.js - State Store + Roll Actions (view rendering lives in js/render.js)
(function(){
  var E = window.PREngine;
  var STORAGE_KEY = "prompt_roller_v4_state";
  var S = { mode: "mix", mood: "any", current: {}, locked: {}, custom: {}, lists: {}, presets: [] };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function record(v){ return !!v && typeof v === "object" && !Array.isArray(v); }

  // Old saves store spicy (boolean). Map it to a roll mode once, then drop the key.
  function normMode(){
    if(S.mode !== "sfw" && S.mode !== "nsfw" && S.mode !== "mix") S.mode = (S.spicy === false) ? "sfw" : "mix";
    if(S.spicy !== undefined) delete S.spicy;
    if(typeof S.mood !== "string" || !S.mood) S.mood = "any";
  }

  function initStore(){
    var loaded = PRStorage.load();
    if(loaded) S = loaded;
    if(!record(S) || !record(S.lists) || !Object.keys(S.lists).length){
      S = {
        mode: "mix", mood: "any", current: {}, locked: {}, custom: {},
        lists: Object.assign({}, clone(window.SEED_SUBJECT||{}), clone(window.SEED_SCENE||{})),
        presets: clone(window.SEED_PRESETS || [])
      };
      E.ALL_SLOTS.forEach(function(slot){ S.current[slot] = E.pickSlot(S.lists[slot], S.mode); });
      var first = PRRoll.rollScene(S.lists, S.mode, {}, S.current, S.mood, S.presets);
      if(first.matched){
        Object.keys(first.vals).forEach(function(k){ S.current[k] = first.vals[k]; });
        if(first.outfit) S.current.outfit = first.outfit;
        S.sceneOutfit = S.current.outfit || "";
      }
    }
    // Old or incomplete saves may omit these maps. Keep existing lists and presets.
    if(!record(S.current)) S.current = {};
    if(!record(S.locked)) S.locked = {};
    if(!record(S.custom)) S.custom = {};
    E.ALL_SLOTS.forEach(function(slot){
      if(S.current[slot] !== undefined && typeof S.current[slot] !== "string")
        S.current[slot] = "";
    });
    if(typeof S.sceneOutfit !== "string") S.sceneOutfit = S.current.outfit || "";
    if(!Array.isArray(S.presets)) S.presets = clone(window.SEED_PRESETS || []);
    normMode();
    saveStore();
  }

  function saveStore(allowRestore){
    return PRStorage.save(S, allowRestore === true);
  }

  function toast(msg){
    var el = document.getElementById("toast");
    if(!el) return;
    el.textContent = msg; el.classList.add("show"); clearTimeout(window.__tt);
    window.__tt = setTimeout(function(){ el.classList.remove("show"); }, 2000);
  }

  function fallbackCopy(text, msg){
    var ta = document.createElement("textarea"), copied = false;
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    try { ta.select(); copied = !!document.execCommand("copy"); } catch(e){}
    document.body.removeChild(ta);
    toast(copied ? (msg || "copied") : "Copy failed - select text manually");
  }

  function copy(text, msg){
    if(!text) return;
    if(navigator.clipboard && navigator.clipboard.writeText){
      try {
        navigator.clipboard.writeText(text).then(
          function(){ toast(msg || "copied"); },
          function(){ fallbackCopy(text, msg); }
        );
      } catch(e){ fallbackCopy(text, msg); }
    } else fallbackCopy(text, msg);
  }

  function canUseOutfit(text, current, lists, presets, mode, mood){
    if(!text) return false;
    var pool = (lists && lists.outfit) || [], all = presets || [];
    if(pool.some(function(it){ return it.t === text; }) &&
       !PRRoll.filterPool(pool, mode, mood).some(function(it){ return it.t === text; })) return false;
    var linked = all.filter(function(p){
      return p && p.values && E.SLOTS_SCENE.every(function(k){
        return p.values[k] === (current || {})[k];
      }) && (p.values.outfit || PRRoll.DEFAULT_OUTFITS[p.name] || "") === text;
    });
    return !linked.length || linked.some(function(p){
      return PRRoll.filterPool(all, mode, mood).indexOf(p) >= 0;
    });
  }
  function allowedOutfit(text, current){
    return canUseOutfit(text, current, S.lists, S.presets, S.mode, S.mood);
  }

  function applyPreset(preset){
    var result = PRRoll.applyScenePreset(preset, S.current, S.locked);
    if(!result.applied){ toast(result.reason); return false; }
    S.current = result.current;
    E.SLOTS_SCENE.forEach(function(slot){ if(!S.locked[slot]) delete S.custom[slot]; });
    if(result.outfitChanged && !S.locked.outfit) delete S.custom.outfit;
    S.sceneOutfit = result.outfit;
    saveStore(); PRRender.renderAll(); toast("scene applied");
    return true;
  }

  function rollGroup(slots){
    var hasChain = !!(window.PRRoll && PRRoll.rollScene);
    // Precheck so an empty filtered pool cannot erase a slot mid-roll.
    var missing = slots.filter(function(slot){
      if(S.locked[slot] || E.SLOTS_SCENE.indexOf(slot) >= 0) return false;
      if(slot === "outfit" && hasChain &&
         (slots.indexOf("venue") >= 0 || (S.sceneOutfit && (S.custom.outfit || allowedOutfit(S.sceneOutfit, S.current))))) return false;
      return !PRRoll.filterPool(S.lists[slot], S.mode, S.mood).length;
    });
    if(missing.length){ toast("No " + missing[0] + " choices match this mode/mood"); return; }
    var roll = null;
    if(hasChain && slots.indexOf("venue") >= 0){
      var candidates = S.presets.filter(function(p){
        var text = p && p.values && (p.values.outfit || PRRoll.DEFAULT_OUTFITS[p.name] || "");
        return !text || canUseOutfit(text, p.values, S.lists, [p], S.mode, S.mood);
      });
      roll = PRRoll.rollScene(S.lists, S.mode, S.locked, S.current, S.mood, candidates);
      if(!roll.matched){ toast("No scene preset matches mode, mood and locks"); return; }
    }
    if(!PRRender.confirmReplace()) return;
    if(roll) S.sceneOutfit = roll.outfit || S.current.outfit || "";
    slots.forEach(function(s){
      if(S.locked[s]) return;
      if(E.SLOTS_SCENE.indexOf(s) >= 0){
        if(roll){ S.current[s] = roll.vals[s] || ""; delete S.custom[s]; }
        return;
      }
      if(s === "outfit" && hasChain){
        if(S.sceneOutfit && (S.custom.outfit || allowedOutfit(S.sceneOutfit, roll ? roll.vals : S.current)))
          S.current[s] = S.sceneOutfit;
        else {
          S.current[s] = E.pickSlot(S.lists[s], S.mode, S.mood);
          S.sceneOutfit = S.current[s];
        }
      } else {
        S.current[s] = E.pickSlot(S.lists[s], S.mode, S.mood);
      }
      delete S.custom[s];
    });
    if(roll && roll.matched && roll.outfit && slots.indexOf("outfit") >= 0 && !S.locked.outfit){
      if(allowedOutfit(roll.outfit, roll.vals)){
        S.current.outfit = roll.outfit; S.sceneOutfit = roll.outfit; delete S.custom.outfit;
      }
    }
    saveStore(); PRRender.renderAll(true); copy(document.getElementById("out").value, "rolled + copied");
  }

  window.PRUI = {
    init: function(){ initStore(); PRRender.renderAll(); this.bindEvents(); },
    getState: function(){ normMode(); return S; },
    saveStore: saveStore,
    renderAll: function(){ PRRender.renderAll(); },
    renderPrompt: function(){ if(PRRender.confirmReplace()) PRRender.renderPrompt(true); },
    onOutEdit: function(){ PRRender.onOutEdit(); },
    rollGroup: rollGroup, applyPreset: applyPreset, canUseOutfit: canUseOutfit, toast: toast, copy: copy,
    bindEvents: function(){
      document.addEventListener("click", function(e){
        var actEl = e.target.closest("[data-act]");
        if(!actEl) return;
        var act = actEl.dataset.act, row = actEl.closest(".slot"), slot = row ? row.dataset.slot : null;
        if(act === "lock" && slot){ S.locked[slot] = !S.locked[slot]; saveStore(); PRRender.renderAll(); }
        else if(act === "roll" && slot){
          if(S.locked[slot]){ toast("Unlock " + slot + " to roll"); return; }
          var next = PRRoll.rollOneSlot(slot, S.current, S.lists, S.mode, S.mood);
          if(!next){ toast("No other matching " + slot + " in your list"); return; }
          if(!PRRender.confirmReplace()) return;
          S.current = next;
          if(slot === "outfit") S.sceneOutfit = next.outfit;
          delete S.custom[slot];
          saveStore(); PRRender.renderAll(true);
        }
        else if(act === "edit" && slot){
          PRSlotEditor.open(slot, S.current[slot] || "", function(value){
            var minor = E.checkMinors(value);
            if(minor) return "Blocked term: " + minor;
            S.current[slot] = value.trim();
            if(slot === "outfit") S.sceneOutfit = S.current.outfit;
            if(value.trim()) S.custom[slot] = true; else delete S.custom[slot];
            saveStore(); PRRender.renderAll();
            return "";
          });
        }
      });
    }
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["ui"] = true;
})();
// EOF-ui.js