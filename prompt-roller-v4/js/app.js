// js/app.js - App Controller, Tabs & Watchdog Verification
(function(){
  function showTab(t){
    ["roll", "batch", "lib", "edit"].forEach(function(k){
      var v = document.getElementById("view-" + k);
      if(v) v.style.display = (k === t) ? "block" : "none";
      var tab = document.getElementById("tab-" + k);
      if(tab) tab.classList.toggle("on", k === t);
    });
    if(t === "edit" && window.PREdit) window.PREdit.render();
    if(t === "batch" && window.PRBatch) window.PRBatch.renderBatch();
    if(t === "lib" && window.PRBatch) window.PRBatch.renderLib();
  }
  window.showTab = showTab;

  function initApp(){
    var required = ["data-rules", "data-subject", "data-scene", "presets", "engine-roll", "engine", "test", "ui", "batch", "ask", "editor", "editor-io", "hooktail", "app"];
    var missing = required.filter(function(f){ return !window.__EOF || !window.__EOF[f]; });
    var badge = document.getElementById("fileBadge");

    if(missing.length === 0 && !window.__bootErr){
      badge.textContent = "✓ file complete";
      badge.style.color = "var(--ok)";
      PRUI.init();
      if(window.PRHookTail){ window.PRHookTail.seed(); PRUI.renderAll(); }
      if(window.PRBatch) window.PRBatch.init();
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
    document.getElementById("spicySw").onclick = function(){
      var s = PRUI.getState(); s.spicy = !s.spicy; PRUI.saveStore(); PRUI.renderAll();
    };
    document.getElementById("btnRollAll").onclick = function(){ PRUI.rollGroup(PREngine.ALL_SLOTS); };
    document.getElementById("btnRollSub").onclick = function(){ PRUI.rollGroup(PREngine.SLOTS_SUBJECT); };
    document.getElementById("btnRollScn").onclick = function(){ PRUI.rollGroup(PREngine.SLOTS_SCENE); };

    document.getElementById("btnApplyPreset").onclick = function(){
      var sel = document.getElementById("presetSel");
      var s = PRUI.getState(), p = s.presets[parseInt(sel.value, 10)];
      if(p && p.values){
        PREngine.SLOTS_SCENE.forEach(function(slot){ if(p.values[slot]) s.current[slot] = p.values[slot]; });
        PRUI.saveStore(); PRUI.renderAll(); PRUI.toast("preset applied");
      }
    };
    document.getElementById("btnSavePreset").onclick = function(){
      var name = (document.getElementById("presetName").value||"").trim();
      if(!name){ alert("Enter preset name"); return; }
      var s = PRUI.getState(), vals = {};
      PREngine.SLOTS_SCENE.forEach(function(slot){ vals[slot] = s.current[slot]||""; });
      s.presets.push({ name: name, values: vals });
      document.getElementById("presetName").value = "";
      PRUI.saveStore(); PRUI.renderAll(); if(window.PREdit) window.PREdit.fillDropdown();
      PRUI.toast("preset saved");
    };
  }

  window.addEventListener("DOMContentLoaded", initApp);
  window.__EOF = window.__EOF || {};
  window.__EOF["app"] = true;
})();
// EOF-app.js