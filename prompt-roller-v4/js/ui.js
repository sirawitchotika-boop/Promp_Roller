// js/ui.js - View Rendering, State Store & Legacy Auto-Migration
(function(){
  var E = window.PREngine;
  var STORAGE_KEY = "prompt_roller_v4_state";
  var S = { spicy: true, current: {}, locked: {}, custom: {}, lists: {}, presets: [], library: [] };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  function migrateLegacy(){
    var v2Raw = null, v1Raw = null;
    try { v2Raw = localStorage.getItem("promptRollerV2"); } catch(e){}
    if(v2Raw){
      try {
        var v2 = JSON.parse(v2Raw);
        var b = v2 && v2.bases && v2.bases[v2.activeBase || "lustify"];
        if(b && b.lists){
          var lists = {};
          E.ALL_SLOTS.forEach(function(s){
            lists[s] = (b.lists[s] && Array.isArray(b.lists[s].items)) ? b.lists[s].items : [];
          });
          return {
            spicy: v2.spicy !== false, current: b.current || {}, locked: b.locked || {}, custom: {},
            lists: lists, presets: Array.isArray(b.scenes) ? b.scenes : clone(window.SEED_PRESETS||[]),
            library: Array.isArray(v2.library) ? v2.library : []
          };
        }
      } catch(e){}
    }
    try { v1Raw = localStorage.getItem("promptRollerV1"); } catch(e){}
    if(v1Raw){
      try {
        var v1 = JSON.parse(v1Raw);
        if(v1 && v1.lists){
          var lists1 = {};
          E.ALL_SLOTS.forEach(function(s){
            lists1[s] = (v1.lists[s] && Array.isArray(v1.lists[s].items)) ? v1.lists[s].items : [];
          });
          return {
            spicy: v1.spicy !== false, current: v1.current || {}, locked: v1.locked || {}, custom: {},
            lists: lists1, presets: Array.isArray(v1.scenes) ? v1.scenes : clone(window.SEED_PRESETS||[]),
            library: []
          };
        }
      } catch(e){}
    }
    return null;
  }

  function initStore(){
    var raw = null, migrated = false;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch(e){}
    if(raw){ try { S = JSON.parse(raw); } catch(e){ S = null; } }
    if(!S || !S.lists || !Object.keys(S.lists).length){
      var leg = migrateLegacy();
      if(leg){ S = leg; migrated = true; }
      else {
        S = {
          spicy: true, current: {}, locked: {}, custom: {},
          lists: Object.assign({}, clone(window.SEED_SUBJECT||{}), clone(window.SEED_SCENE||{})),
          presets: clone(window.SEED_PRESETS || []),
          library: []
        };
        E.ALL_SLOTS.forEach(function(slot){ S.current[slot] = E.pickSlot(S.lists[slot], S.spicy); });
      }
    }
    if(!Array.isArray(S.library)) S.library = [];
    if(!Array.isArray(S.presets)) S.presets = clone(window.SEED_PRESETS || []);
    saveStore();
    if(migrated) setTimeout(function(){ toast("migrated existing data to v4"); }, 400);
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
      if(!S.spicy && p.x) return;
      var opt = document.createElement("option");
      opt.value = i; opt.textContent = p.name + (p.x ? " [Spicy]" : "");
      sel.appendChild(opt);
    });
  }

  function renderAll(){
    renderSlots("slotsSubject", E.SLOTS_SUBJECT);
    renderSlots("slotsScene", E.SLOTS_SCENE);
    renderPresets();
    renderPrompt();
    var sw = document.getElementById("spicySw"), lbl = document.getElementById("spicyLbl");
    if(sw) sw.classList.toggle("on", S.spicy);
    if(lbl) lbl.textContent = S.spicy ? "ON" : "OFF";
  }

  function rollGroup(slots){
    slots.forEach(function(s){
      if(!S.locked[s]){ S.current[s] = E.pickSlot(S.lists[s], S.spicy); delete S.custom[s]; }
    });
    saveStore(); renderAll(); copy(document.getElementById("out").value, "rolled + copied");
  }

  window.PRUI = {
    init: function(){ initStore(); renderAll(); this.bindEvents(); },
    getState: function(){ return S; },
    saveStore: saveStore, renderAll: renderAll, renderPrompt: renderPrompt,
    onOutEdit: onOutEdit, rollGroup: rollGroup, toast: toast, copy: copy,
    bindEvents: function(){
      document.addEventListener("click", function(e){
        var actEl = e.target.closest("[data-act]");
        if(!actEl) return;
        var act = actEl.dataset.act, row = actEl.closest(".slot"), slot = row ? row.dataset.slot : null;
        if(act === "lock" && slot){ S.locked[slot] = !S.locked[slot]; saveStore(); renderAll(); }
        else if(act === "roll" && slot){ S.current[slot] = E.pickSlot(S.lists[slot], S.spicy); delete S.custom[slot]; saveStore(); renderAll(); }
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
