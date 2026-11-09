// js/app.js - App Controller, Tabs & Watchdog Verification (v4.3 roll modes + mood filter)
(function(){
  var currentView = "roll", viewScroll = { roll: 0, edit: 0 };
  function showTab(t){
    if(t !== "roll" && t !== "edit") return;
    var switched = t !== currentView;
    if(switched && typeof window.scrollY === "number")
      viewScroll[currentView] = window.scrollY;
    ["roll", "edit"].forEach(function(k){
      var selected = k === t, v = document.getElementById("view-" + k);
      if(v){ v.hidden = !selected; v.style.display = selected ? "block" : "none"; }
      var tab = document.getElementById("tab-" + k);
      if(tab){
        tab.classList.toggle("on", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
    });
    if(t === "edit" && window.PREdit) window.PREdit.render();
    currentView = t;
    if(switched && window.scrollTo) window.scrollTo(0, viewScroll[t] || 0);
  }
  window.showTab = showTab;

  function validatePreset(name, vals, presets){
    if(!name || !name.trim()) return "Enter a preset name.";
    if((presets || []).some(function(p){
      return p && typeof p.name === "string" &&
        p.name.trim().toLowerCase() === name.trim().toLowerCase();
    })) return "A scene preset with that name already exists.";
    var missing = PREngine.SLOTS_SCENE.filter(function(k){
      return typeof vals[k] !== "string" || !vals[k].trim();
    });
    return missing.length ? "Fill all four Scene slots before saving: " + missing.join(", ") : "";
  }

  function initApp(){
    var required = ["data-rules", "data-subject", "data-scene", "presets", "engine-roll", "engine", "import", "backup", "test", "test-preset", "test-filter", "test-backup", "test-integration", "ui", "render", "ask", "editor", "editor-io", "hooktail", "slot-editor", "navigation", "app"];
    var missing = required.filter(function(f){ return !window.__EOF || !window.__EOF[f]; });
    var badge = document.getElementById("fileBadge");

    if(missing.length === 0 && !window.__bootErr){
      badge.textContent = "✓ file complete";
      badge.style.color = "var(--ok)";
      PRUI.init();
      if(window.PRHookTail){ window.PRHookTail.seed(); PRUI.renderAll(); }
      if(window.PREdit) window.PREdit.init();
      if(window.PRSlotEditor) window.PRSlotEditor.init();
      bindControls();
      if(window.PRNavigation) window.PRNavigation.init();
    } else {
      var err = window.__bootErr || ("Missing or cut file(s): " + missing.join(", "));
      badge.textContent = "⚠ error loading";
      badge.style.color = "var(--bad)";
      var b = document.createElement("div");
      b.className = "banner-err";
      b.textContent = "APP FAILED TO START\n" + err;
      document.body.appendChild(b);
    }
  }

  function bindControls(){
    var tabs = document.querySelector(".tabs");
    if(tabs) tabs.addEventListener("keydown", function(e){
      var keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if(keys.indexOf(e.key) < 0 || !e.target || !e.target.id) return;
      var order = ["roll", "edit"], i = order.indexOf(e.target.id.replace(/^tab-/, ""));
      if(i < 0) return;
      e.preventDefault();
      var next = e.key === "Home" ? 0 : e.key === "End" ? 1 :
        (i + (e.key === "ArrowRight" ? 1 : -1) + order.length) % order.length;
      showTab(order[next]);
      document.getElementById("tab-" + order[next]).focus();
    });
    // Null-safe binder: a renamed or missing ID can no longer crash boot.
    function on(id, fn){ var el = document.getElementById(id); if(el) el.onclick = fn; }
    var seg = document.getElementById("modeSeg");
    if(seg) seg.addEventListener("click", function(e){
      var b = e.target.closest(".mbtn");
      if(!b) return;
      var s = PRUI.getState();
      s.mode = b.getAttribute("data-mode");
      PRUI.saveStore(); PRUI.renderAll();
      PRUI.toast("roll mode: " + s.mode);
    });
    var moodSel = document.getElementById("moodSel");
    if(moodSel) moodSel.onchange = function(){
      var s = PRUI.getState();
      s.mood = this.value || "any";
      PRUI.saveStore(); PRUI.renderAll();
      PRUI.toast("mood: " + s.mood);
    };
    on("btnRollAll", function(){ PRUI.rollGroup(PREngine.ALL_SLOTS); });
    on("btnRollSub", function(){ PRUI.rollGroup(PREngine.SLOTS_SUBJECT); });
    on("btnRollScn", function(){ PRUI.rollGroup(PREngine.SLOTS_SCENE); });

    on("btnApplyPreset", function(){
      var sel = document.getElementById("presetSel");
      var s = PRUI.getState(), p = s.presets[parseInt(sel.value, 10)];
      if(p) PRUI.applyPreset(p);
    });
    on("btnSavePreset", function(){
      var name = (document.getElementById("presetName").value||"").trim();
      if(!name){ alert("Enter preset name"); return; }
      var s = PRUI.getState(), vals = {};
      PREngine.SLOTS_SCENE.forEach(function(slot){ vals[slot] = s.current[slot]||""; });
      vals.outfit = s.current.outfit || ""; // Linked scene clothing.
      var error = validatePreset(name, vals, s.presets);
      if(error){ alert(error); return; }
      // Auto-tag: saving while a mood is selected tags the new preset with it.
      var moodTag = (s.mood && s.mood !== "any") ? s.mood : undefined;
      s.presets.push({ name: name, values: vals, m: moodTag });
      document.getElementById("presetName").value = "";
      PRUI.saveStore(); PRUI.renderAll(); if(window.PREdit) window.PREdit.fillDropdown();
      PRUI.toast("preset saved" + (moodTag ? " [M: " + moodTag + "]" : ""));
    });
  }

  window.PRApp = { validatePreset: validatePreset };
  window.addEventListener("DOMContentLoaded", initApp);
  window.__EOF = window.__EOF || {};
  window.__EOF["app"] = true;
})();
// EOF-app.js