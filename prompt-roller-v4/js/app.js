// js/app.js - App Controller, Tabs & Watchdog Verification (v4.3 roll modes + mood filter)
(function(){
  function showTab(t){
    ["roll", "edit"].forEach(function(k){
      var v = document.getElementById("view-" + k);
      if(v) v.style.display = (k === t) ? "block" : "none";
      var tab = document.getElementById("tab-" + k);
      if(tab) tab.classList.toggle("on", k === t);
    });
    if(t === "edit" && window.PREdit) window.PREdit.render();
  }
  window.showTab = showTab;

  function initApp(){
    var required = ["data-rules", "data-subject", "data-scene", "presets", "engine-roll", "engine", "import", "backup", "test", "test-preset", "test-filter", "test-backup", "test-integration", "ui", "render", "ask", "editor", "editor-io", "hooktail", "app"];
    var missing = required.filter(function(f){ return !window.__EOF || !window.__EOF[f]; });
    var badge = document.getElementById("fileBadge");

    if(missing.length === 0 && !window.__bootErr){
      badge.textContent = "✓ file complete";
      badge.style.color = "var(--ok)";
      PRUI.init();
      if(window.PRHookTail){ window.PRHookTail.seed(); PRUI.renderAll(); }
      if(window.PREdit) window.PREdit.init();
      bindControls();
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
      // Auto-tag: saving while a mood is selected tags the new preset with it.
      var moodTag = (s.mood && s.mood !== "any") ? s.mood : undefined;
      s.presets.push({ name: name, values: vals, m: moodTag });
      document.getElementById("presetName").value = "";
      PRUI.saveStore(); PRUI.renderAll(); if(window.PREdit) window.PREdit.fillDropdown();
      PRUI.toast("preset saved" + (moodTag ? " [M: " + moodTag + "]" : ""));
    });
  }

  window.addEventListener("DOMContentLoaded", initApp);
  window.__EOF = window.__EOF || {};
  window.__EOF["app"] = true;
})();
// EOF-app.js