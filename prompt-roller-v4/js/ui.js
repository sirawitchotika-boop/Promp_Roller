// js/ui.js - State Store + Roll Actions (view rendering lives in js/render.js)
(function(){
  var E = window.PREngine;
  var STORAGE_KEY = "prompt_roller_v4_state";
  var S = { mode: "mix", mood: "any", current: {}, locked: {}, custom: {}, lists: {}, presets: [] };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  // Old saves store spicy (boolean). Map it to a roll mode once, then drop the key.
  function normMode(){
    if(S.mode !== "sfw" && S.mode !== "nsfw" && S.mode !== "mix") S.mode = (S.spicy === false) ? "sfw" : "mix";
    if(S.spicy !== undefined) delete S.spicy;
    if(!S.mood) S.mood = "any";
  }

  function initStore(){
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch(e){}
    if(raw){ try { S = JSON.parse(raw); } catch(e){ S = null; } }
    if(!S || !S.lists || !Object.keys(S.lists).length){
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
    if(!Array.isArray(S.presets)) S.presets = clone(window.SEED_PRESETS || []);
    normMode();
    saveStore();
  }

  function saveStore(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch(e){}
  }

  function toast(msg){
    var el = document.getElementById("toast");
    if(!el) return;
    el.textContent = msg; el.classList.add("show"); clearTimeout(window.__tt);
    window.__tt = setTimeout(function(){ el.classList.remove("show"); }, 2000);
  }

  function copy(text, msg){
    if(!text) return;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ toast(msg || "copied"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy");
      document.body.removeChild(ta); toast(msg || "copied");
    }
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
    var roll = null;
    if(hasChain && slots.indexOf("venue") >= 0){
      roll = PRRoll.rollScene(S.lists, S.mode, S.locked, S.current, S.mood, S.presets);
      if(!roll.matched){ toast("No matching scene preset - unlock a scene slot"); return; }
      S.sceneOutfit = roll.outfit || S.current.outfit || "";
    }
    var ctx = roll ? roll.ctx : (hasChain ? PRRoll.ctxFromCurrent(S.lists, S.current) : null);
    slots.forEach(function(s){
      if(S.locked[s]) return;
      if(E.SLOTS_SCENE.indexOf(s) >= 0){
        if(roll){ S.current[s] = roll.vals[s] || ""; delete S.custom[s]; }
        return;
      }
      if(s === "outfit" && hasChain){
        if(S.sceneOutfit) S.current[s] = S.sceneOutfit;
      } else {
        S.current[s] = E.pickSlot(S.lists[s], S.mode, S.mood);
      }
      delete S.custom[s];
    });
    if(roll && roll.matched && roll.outfit && !S.locked.outfit){
      S.current.outfit = roll.outfit; delete S.custom.outfit;
    }
    saveStore(); PRRender.renderAll(); copy(document.getElementById("out").value, "rolled + copied");
  }

  window.PRUI = {
    init: function(){ initStore(); PRRender.renderAll(); this.bindEvents(); },
    getState: function(){ normMode(); return S; },
    saveStore: saveStore,
    renderAll: function(){ PRRender.renderAll(); },
    renderPrompt: function(){ PRRender.renderPrompt(); },
    onOutEdit: function(){ PRRender.onOutEdit(); },
    rollGroup: rollGroup, applyPreset: applyPreset, toast: toast, copy: copy,
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
          S.current = next;
          if(slot === "outfit") S.sceneOutfit = next.outfit;
          delete S.custom[slot];
          saveStore(); PRRender.renderAll();
        }
        else if(act === "edit" && slot){
          var val = prompt("Edit slot [" + slot + "]:\n(Empty = clear slot)", S.current[slot] || "");
          if(val !== null){
            var minor = E.checkMinors(val);
            if(minor){ alert("BLOCKED: Minors word '" + minor + "' is strictly prohibited."); return; }
            S.current[slot] = val.trim();
            if(slot === "outfit") S.sceneOutfit = S.current.outfit; // Keep manual clothing on Subject rolls.
            if(val.trim()) S.custom[slot] = true; else delete S.custom[slot];
            saveStore(); PRRender.renderAll();
          }
        }
      });
    }
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["ui"] = true;
})();
// EOF-ui.js