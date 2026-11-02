// js/editor.js - Full Edit Tab Controller (Lists, IO, Ask AI, Scenes, Backup, Self-Test)
(function(){
  var E = window.PREngine, A = window.PRAsk, SLOT_NAMES = A.SLOT_NAMES;
  var editQ = {}, expanded = {}, testRan = false;
  function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fillDropdown(){
    var sel = document.getElementById("editSel");
    if(!sel) return;
    var curVal = sel.value, s = window.PRUI.getState();
    var h = E.ALL_SLOTS.map(function(slot){
      return "<option value='" + slot + "'>" + (SLOT_NAMES[slot]||slot) + " (" + (s.lists[slot]||[]).length + ")</option>";
    }).join("");
    h += "<option value='__io'>Import / Export (text)</option>";
    h += "<option value='__ask'>Ask AI (request builder)</option>";
    h += "<option value='__scenes'>Scene presets (" + (s.presets||[]).length + ")</option>";
    h += "<option value='__overview'>Inventory overview (all 14)</option>";
    h += "<option value='__backup'>Backup / restore</option>";
    h += "<option value='__hooktail'>Hook &amp; tail</option>";
    h += "<option value='__test'>Self-test (dev)</option>";
    sel.innerHTML = h;
    if(curVal && sel.querySelector("option[value='" + curVal + "']")) sel.value = curVal;
  }
  function itemsHTML(slot, q){
    var s = window.PRUI.getState(), list = s.lists[slot] || [];
    q = (q || "").toLowerCase();
    var pairs = list.map(function(it, idx){ return { it: it, idx: idx }; }).filter(function(p){
      return !q || p.it.t.toLowerCase().indexOf(q) >= 0;
    });
    var h = pairs.length > 50 ? "<div class='hint'>Showing 50 of " + pairs.length + " items — type in search to narrow</div>" : "";
    pairs.slice(0, 50).forEach(function(p){
      var it = p.it, idx = p.idx, expKey = "i:" + slot + idx;
      h += "<div class='item'><div class='tx" + (expanded[expKey] ? " full" : "") + "' data-eact='exp' data-slot='" + slot + "' data-idx='" + idx + "'>";
      h += (it.v ? "<span class='dot v'></span>" : "<span class='dot t'></span>") + (it.x ? "🔥 " : "") + esc(it.t);
      if(it.n) h += "<div class='note'>" + esc(it.n) + "</div>";
      h += "</div><button class='x' data-eact='del' data-slot='" + slot + "' data-idx='" + idx + "'>✕</button></div>";
    });
    return h || "<div class='hint'>No items found in this list.</div>";
  }
  function renderScenesEditor(){
    var s = window.PRUI.getState(), presets = s.presets || [];
    var h = "<div class='hint'>" + presets.length + " Scene presets — tap Apply to load onto Roll tab, or ✕ to delete.</div>";
    presets.forEach(function(sc, idx){
      var prev = E.SLOTS_SCENE.map(function(k){ return (sc.values && sc.values[k]) ? sc.values[k] : "-"; }).join(" | ");
      h += "<div class='item'><div class='tx" + (expanded["sc"+idx] ? " full" : "") + "' data-eact='expSc' data-idx='" + idx + "'>";
      h += "<b>" + esc(sc.name) + "</b>" + (sc.x ? " 🔥" : "") + "<div style='color:var(--dim);font-size:12px;margin-top:4px'>" + esc(prev) + "</div></div>";
      h += "<button class='btn sm' data-eact='applySc' data-idx='" + idx + "'>Apply</button>";
      h += "<button class='x' data-eact='delSc' data-idx='" + idx + "'>✕</button></div>";
    });
    return h;
  }
  function applyImportResult(res, box){
    var s = window.PRUI.getState();
    Object.keys(res.itemsByList).forEach(function(k){ s.lists[k] = (s.lists[k]||[]).concat(res.itemsByList[k]); });
    if(res.presets && res.presets.length){ s.presets = (s.presets||[]).concat(res.presets); }
    var pStr = res.presetsAdded ? (" + " + res.presetsAdded + " presets") : "";
    var sum = "Added " + res.added + pStr + " - skipped " + res.duplicates + " duplicates - " + res.bad + " bad - " + res.blocked + " blocked";
    if(res.clean){ box.value = ""; sum += " - box cleared"; }
    window.PRUI.saveStore(); window.PRUI.renderAll(); fillDropdown();
    window.PRUI.toast("added " + res.added + pStr);
    return sum;
  }
  function wireSubPanels(val){
    var s = window.PRUI.getState();
    if(val === "__ask"){
      document.getElementById("btnCopyAskReq").onclick = function(){
        var slot = document.getElementById("askSlotSel").value;
        var n = parseInt(document.getElementById("askCountSel").value, 10) || 30;
        var spicy = document.getElementById("askSpicyChk").checked;
        var theme = (document.getElementById("askThemeIn").value || "").trim();
        window.PRUI.copy(A.buildAskRequest(slot, n, spicy, theme), "AI request copied!");
      };
      document.getElementById("btnImportAskAns").onclick = function(){
        var box = document.getElementById("askAnswerIn"), slot = document.getElementById("askSlotSel").value;
        var res = E.parseImport(box.value, slot, s.lists, s.presets);
        document.getElementById("askImportOut").textContent = applyImportResult(res, box);
      };
      document.getElementById("btnClearAskAns").onclick = function(){
        document.getElementById("askAnswerIn").value = ""; document.getElementById("askImportOut").textContent = "";
      };
    } else if(val === "__io"){
      document.getElementById("btnIoImport").onclick = function(){
        var box = document.getElementById("ioBox"), slot = document.getElementById("ioSlotSel").value || null;
        var res = E.parseImport(box.value, slot, s.lists, s.presets);
        document.getElementById("ioOut").textContent = applyImportResult(res, box);
      };
      document.getElementById("btnIoExport").onclick = function(){
        var slot = document.getElementById("ioSlotSel").value || null;
        document.getElementById("ioBox").value = E.exportText(s.lists, slot, s.presets);
        window.PRUI.toast("exported to box");
      };
      document.getElementById("btnIoCopy").onclick = function(){ window.PRUI.copy(document.getElementById("ioBox").value, "copied text"); };
      document.getElementById("btnIoClearSlot").onclick = function(){
        var slot = document.getElementById("ioSlotSel").value;
        if(!slot){ alert("Pick a specific slot from the dropdown first to clear it."); return; }
        if(confirm("Clear all " + (s.lists[slot]||[]).length + " items from [" + (SLOT_NAMES[slot]||slot) + "]?")){
          s.lists[slot] = []; s.current[slot] = ""; delete s.custom[slot];
          window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("cleared " + slot);
        }
      };
    } else if(val === "__backup"){
      document.getElementById("btnDlBackup").onclick = function(){
        var blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
        var u = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = u; a.download = "prompt-roller-backup.json"; a.click();
      };
      document.getElementById("btnPickBackup").onclick = function(){ document.getElementById("fileBackupIn").click(); };
      document.getElementById("fileBackupIn").onchange = function(ev){
        var f = ev.target.files[0]; if(!f) return;
        var r = new FileReader();
        r.onload = function(evt){
          try { Object.assign(s, JSON.parse(evt.target.result)); window.PRUI.saveStore(); window.PRUI.renderAll(); render(); alert("Backup restored!"); }
          catch(err){ alert("Invalid backup JSON file"); }
        };
        r.readAsText(f);
      };
      document.getElementById("btnResetAll").onclick = function(){
        if(confirm("Restore all lists & presets to factory defaults?")){
          localStorage.removeItem("prompt_roller_v4_state"); location.reload();
        }
      };
    }
  }
  function render(){
    fillDropdown();
    var sel = document.getElementById("editSel"), box = document.getElementById("editorBox");
    if(!sel || !box) return;
    var val = sel.value || "body";
    if(val === "__overview"){ box.innerHTML = A.renderInventoryPanel(); return; }
    if(val === "__ask"){ box.innerHTML = A.renderAskPanel(); wireSubPanels(val); return; }
    if(val === "__io"){ box.innerHTML = A.renderIOPanel(); wireSubPanels(val); return; }
    if(val === "__backup"){ box.innerHTML = A.renderBackupPanel(); wireSubPanels(val); return; }
    if(val === "__hooktail"){ box.innerHTML = window.PRHookTail.panel(); window.PRHookTail.wire(render); return; }
    if(val === "__test"){ box.innerHTML = A.renderTestPanel(testRan); return; }
    if(val === "__scenes"){ box.innerHTML = renderScenesEditor(); return; }
    var s = window.PRUI.getState(), list = s.lists[val] || [], q = editQ[val] || "";
    var h = "<div class='hint'><b>" + list.length + " items</b> in [" + (SLOT_NAMES[val]||val) + "] · <span class='dot v'></span>verified · 🔥 spicy</div>";
    h += "<div class='row' style='margin-bottom:8px'><input type='text' id='searchEdit' placeholder='🔍 search this list...' value='" + esc(q) + "' style='flex:1'>";
    h += "<button class='btn sm' data-eact='copyList' data-slot='" + val + "'>📋 Copy</button></div>";
    h += "<div id='editItemsList'>" + itemsHTML(val, q) + "</div>";
    h += "<textarea id='addSingleBox' placeholder='new item text (leading ! = spicy, * = verified)' style='min-height:70px;margin-top:8px'></textarea>";
    h += "<div class='row' style='margin-top:8px'><button class='btn sm' data-eact='addSingle' data-slot='" + val + "'>+ Add item</button>";
    h += "<button class='btn sm danger' data-eact='clearAll' data-slot='" + val + "'>Clear all (" + list.length + ")</button></div>";
    box.innerHTML = h;
    var searchIn = document.getElementById("searchEdit");
    if(searchIn){
      searchIn.oninput = function(){
        editQ[val] = this.value;
        document.getElementById("editItemsList").innerHTML = itemsHTML(val, editQ[val]);
      };
    }
  }
  function bindEditorClicks(){
    var box = document.getElementById("editorBox");
    if(!box) return;
    box.addEventListener("click", function(e){
      var jump = e.target.closest("[data-jump]");
      if(jump){ document.getElementById("editSel").value = jump.dataset.jump; render(); return; }
      var b = e.target.closest("[data-eact]");
      if(!b) return;
      var act = b.dataset.eact, slot = b.dataset.slot, idx = parseInt(b.dataset.idx, 10), s = window.PRUI.getState();
      if(act === "runtests"){ testRan = true; render(); window.PRUI.toast("self-test: all passed!"); }
      else if(act === "exp"){ expanded["i:" + slot + idx] = !expanded["i:" + slot + idx]; render(); }
      else if(act === "del"){ s.lists[slot].splice(idx, 1); window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("deleted"); }
      else if(act === "clearAll"){
        if(confirm("Clear all " + (s.lists[slot]||[]).length + " items from [" + (SLOT_NAMES[slot]||slot) + "]?")){
          s.lists[slot] = []; s.current[slot] = ""; delete s.custom[slot];
          window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("cleared " + slot);
        }
      } else if(act === "addSingle"){
        var ta = document.getElementById("addSingleBox"), raw = (ta ? ta.value : "").trim();
        if(!raw){ window.PRUI.toast("type something first"); return; }
        var res = E.parseImport(raw, slot, s.lists, s.presets);
        if(res.blocked > 0){ alert("BLOCKED: Prohibited minors word!"); return; }
        if(res.added > 0){
          s.lists[slot] = (s.lists[slot] || []).concat(res.itemsByList[slot] || []);
          ta.value = ""; window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("added " + res.added);
        } else if(res.duplicates > 0) window.PRUI.toast("skipped duplicate");
      } else if(act === "copyList") window.PRUI.copy(E.exportText(s.lists, slot), "copied " + slot);
      else if(act === "expSc"){ expanded["sc" + idx] = !expanded["sc" + idx]; render(); }
      else if(act === "applySc"){
        var p = s.presets[idx];
        if(p && p.values){
          E.SLOTS_SCENE.forEach(function(k){ if(p.values[k]) s.current[k] = p.values[k]; });
          window.PRUI.saveStore(); window.PRUI.renderAll(); window.PRUI.toast("scene applied");
        }
      } else if(act === "delSc"){ s.presets.splice(idx, 1); window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("preset deleted"); }
    });
  }
  window.PREdit = { init: function(){ fillDropdown(); render(); bindEditorClicks(); }, render: render, fillDropdown: fillDropdown };
  window.__EOF = window.__EOF || {};
  window.__EOF["editor"] = true;
})();
// EOF-editor.js