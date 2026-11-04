// js/ui.js - View Rendering & State Store (v4.2 roll modes: sfw / mix / nsfw)
(function(){
  var E = window.PREngine;
  var STORAGE_KEY = "prompt_roller_v4_state";
  var S = { mode: "mix", current: {}, locked: {}, custom: {}, lists: {}, presets: [] };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  // Old saves store spicy (boolean). Map it to a roll mode once, then drop the key.
  function normMode(){
    if(S.mode !== "sfw" && S.mode !== "nsfw" && S.mode !== "mix"){
      S.mode = (S.spicy === false) ? "sfw" : "mix";
    }
    if(S.spicy !== undefined) delete S.spicy;
  }

  function initStore(){
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch(e){}
    if(raw){ try { S = JSON.parse(raw); } catch(e){ S = null; } }
    if(!S || !S.lists || !Object.keys(S.lists).length){
      S = {
        mode: "mix", current: {}, locked: {}, custom: {},
        lists: Object.assign({}, clone(window.SEED_SUBJECT||{}), clone(window.SEED_SCENE||{})),
        presets: clone(window.SEED_PRESETS || [])
      };
      E.ALL_SLOTS.forEach(function(slot){ S.current[slot] = E.pickSlot(S.lists[slot], S.mode); });
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
    el.textContent = msg; el.classList.add("show");
    clearTimeout(window.__tt);
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

  function renderSlots(containerId, slots){
    var c = document.getElementById(containerId);
    if(!c) return;
    c.innerHTML = "";
    slots.forEach(function(slot){
      var isLock = !!S.locked[slot], isCust = !!S.custom[slot];
      var val = S.current[slot] || "- empty -";
      var row = document.createElement("div");
      row.className = "slot" + (isLock ? " locked" : "");
      row.dataset.slot = slot;
      row.innerHTML = "<div class='sname'>" + slot + "</div>" +
        "<div class='sval' data-act='edit'>" + (isCust ? "<span class='badge'>CUSTOM</span> " : "") + val + "</div>" +
        "<div class='sact'>" +
        "<button class='btn sm lk" + (isLock ? " on" : "") + "' data-act='lock'>" + (isLock ? "LOCKED" : "Lock") + "</button>" +
        "<button class='btn sm' data-act='roll'>🎲</button>" +
        "</div>";
      c.appendChild(row);
    });
  }

  function renderPrompt(){
    var full = E.buildPrompt(S.current);
    var out = document.getElementById("out");
    if(out) out.value = full;
    onOutEdit();
  }

  function onOutEdit(){
    var out = document.getElementById("out"), full = out ? out.value : "";
    var warns = E.validate(S.current, full), wBox = document.getElementById("warns");
    if(wBox){
      wBox.innerHTML = warns.length ? warns.join("<br>") : "";
      wBox.style.display = warns.length ? "block" : "none";
    }
    var cnt = document.getElementById("counter");
    if(cnt){
      var wCount = full.trim() ? full.trim().split(/\s+/).length : 0;
      cnt.textContent = full.length + " chars · " + wCount + " words";
    }
  }

  function renderPresets(){
    var sel = document.getElementById("presetSel");
    if(!sel) return;
    sel.innerHTML = "";
    (S.presets || []).forEach(function(p, i){
      if(S.mode === "sfw" && p.x) return;
      var opt = document.createElement("option");
      opt.value = i; opt.textContent = p.name + (p.x ? " [Spicy]" : "");
      sel.appendChild(opt);
    });
  }

  function renderAll(){
    normMode();
    renderSlots("slotsSubject", E.SLOTS_SUBJECT);
    renderSlots("slotsScene", E.SLOTS_SCENE);
    renderPresets();
    renderPrompt();
    var seg = document.getElementById("modeSeg");
    if(seg){
      var btns = seg.querySelectorAll(".mbtn");
      for(var i = 0; i < btns.length; i++){
        btns[i].classList.toggle("on", btns[i].getAttribute("data-mode") === S.mode);
      }
    }
  }

  function rollGroup(slots){
    var hasChain = !!(window.PRRoll && PRRoll.rollScene);
    var roll = null;
    if(hasChain && slots.indexOf("venue") >= 0){
      roll = PRRoll.rollScene(S.lists, S.mode, S.locked, S.current);
    }
    var ctx = roll ? roll.ctx : (hasChain ? PRRoll.ctxFromCurrent(S.lists, S.current) : null);
    slots.forEach(function(s){
      if(S.locked[s]) return;
      if(E.SLOTS_SCENE.indexOf(s) >= 0){
        if(roll){ S.current[s] = roll.vals[s] || ""; delete S.custom[s]; }
        return;
      }
      if(s === "outfit" && hasChain){
        var gPick = PRRoll.pickGuarded(S.lists.outfit, S.mode, ctx);
        S.current[s] = gPick ? gPick.t : "";
      } else {
        S.current[s] = E.pickSlot(S.lists[s], S.mode);
      }
      delete S.custom[s];
    });
    saveStore(); renderAll(); copy(document.getElementById("out").value, "rolled + copied");
  }

  window.PRUI = {
    init: function(){ initStore(); renderAll(); this.bindEvents(); },
    getState: function(){ normMode(); return S; },
    saveStore: saveStore, renderAll: renderAll, renderPrompt: renderPrompt,
    onOutEdit: onOutEdit, rollGroup: rollGroup, toast: toast, copy: copy,
    bindEvents: function(){
      document.addEventListener("click", function(e){
        var actEl = e.target.closest("[data-act]");
        if(!actEl) return;
        var act = actEl.dataset.act, row = actEl.closest(".slot"), slot = row ? row.dataset.slot : null;
        if(act === "lock" && slot){ S.locked[slot] = !S.locked[slot]; saveStore(); renderAll(); }
        else if(act === "roll" && slot){
          var guardAware = window.PRRoll && PRRoll.pickGuarded &&
            (E.SLOTS_SCENE.indexOf(slot) >= 0 || slot === "outfit");
          if(guardAware){
            var ctx = PRRoll.ctxFromCurrent(S.lists, S.current);
            var gPick = PRRoll.pickGuarded(S.lists[slot], S.mode, ctx);
            S.current[slot] = gPick ? gPick.t : "";
          } else {
            S.current[slot] = E.pickSlot(S.lists[slot], S.mode);
          }
          delete S.custom[slot]; saveStore(); renderAll();
        }
        else if(act === "edit" && slot){
          var val = prompt("Edit slot [" + slot + "]:\n(Empty = clear slot)", S.current[slot] || "");
          if(val !== null){
            var minor = E.checkMinors(val);
            if(minor){ alert("BLOCKED: Minors word '" + minor + "' is strictly prohibited."); return; }
            S.current[slot] = val.trim();
            if(val.trim()) S.custom[slot] = true; else delete S.custom[slot];
            saveStore(); renderAll();
          }
        }
      });
    }
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["ui"] = true;
})();
// EOF-ui.js