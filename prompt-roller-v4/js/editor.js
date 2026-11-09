// js/editor.js - Full Edit Tab Controller (Lists, Scenes, Self-Test; panel wiring lives in editor-io.js)
(function(){
  var E = window.PREngine, A = window.PRAsk, SLOT_NAMES = A.SLOT_NAMES;
  var editQ = {}, expanded = {}, testResults = null;
  var activePanel = "vocabulary", toolPanel = "__overview";
  function panelFor(target){
    if(E.ALL_SLOTS.indexOf(target) >= 0) return "vocabulary";
    if(target === "__scenes") return "scenes";
    if(target === "__exchange") return "exchange";
    if(["__overview","__backup","__hooktail","__test"].indexOf(target) >= 0) return "tools";
    return ["vocabulary","scenes","exchange","tools"].indexOf(target) >= 0 ? target : null;
  }
  function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function confirmDelete(label){
    return confirm("Delete " + String(label || "").slice(0, 72) + "? This cannot be undone.");
  }
  function fillDropdown(){
    var sel = document.getElementById("editSel");
    if(!sel) return;
    var curVal = sel.value, s = window.PRUI.getState();
    var h = E.ALL_SLOTS.map(function(slot){
      return "<option value='" + slot + "'>" + (SLOT_NAMES[slot]||slot) + " (" + (s.lists[slot]||[]).length + ")</option>";
    }).join("");
    sel.innerHTML = h;
    if(curVal && sel.querySelector("option[value='" + curVal + "']")) sel.value = curVal;
  }
  // Refresh the slot dropdown inside the Exchange panel (counts go live after import)
  function refreshPanelSels(){
    var el = document.getElementById("exSlotSel");
    if(!el) return;
    var cur = el.value;
    el.innerHTML = A.slotOptionsHTML(true);
    if(el.querySelector("option[value='" + cur + "']")) el.value = cur;
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
      h += "<div class='item'><button type='button' class='tx" + (expanded[expKey] ? " full" : "") + "' data-eact='exp' data-slot='" + slot + "' data-idx='" + idx + "' aria-expanded='" + !!expanded[expKey] + "'>";
      h += (it.v ? "<span class='dot v'></span>" : "<span class='dot t'></span>") + (it.x ? "🔥 " : "") + esc(it.t);
      if(it.g) h += "<div class='note guard'>[G: " + esc(Object.keys(it.g).map(function(k){ return k + "=" + it.g[k]; }).join(", ")) + "]</div>";
      if(it.m) h += "<div class='note mood'>[M: " + esc(it.m) + "]</div>";
      if(it.n) h += "<div class='note'>" + esc(it.n) + "</div>";
      h += "</button><button type='button' class='x' aria-label='Delete " + esc(SLOT_NAMES[slot]||slot) + " item' data-eact='del' data-slot='" + slot + "' data-idx='" + idx + "'>Delete</button></div>";
    });
    return h || "<div class='hint'>No items found in this list.</div>";
  }
  function renderScenesEditor(){
    var s = window.PRUI.getState(), presets = s.presets || [];
    var h = "<div class='hint'>" + presets.length + " Scene presets — tap Apply to load onto Roll tab, or ✕ to delete.</div>";
    presets.forEach(function(sc, idx){
      var prev = E.SLOTS_SCENE.map(function(k){ return (sc.values && sc.values[k]) ? sc.values[k] : "-"; }).join(" | ");
      h += "<div class='item'><button type='button' class='tx" + (expanded["sc"+idx] ? " full" : "") + "' data-eact='expSc' data-idx='" + idx + "' aria-expanded='" + !!expanded["sc"+idx] + "'>";
      h += "<b>" + esc(sc.name) + "</b>" + (sc.x ? " 🔥" : "") +
        (sc.m ? " <span style='color:var(--acc);font-size:11px'>[M: " + esc(sc.m) + "]</span>" : "") +
        "<div style='color:var(--dim);font-size:12px;margin-top:4px'>" + esc(prev) + "</div></div>";
      h += "</button><button type='button' class='btn sm' data-eact='applySc' data-idx='" + idx + "'>Apply</button>";
      h += "<button type='button' class='x' aria-label='Delete scene preset' data-eact='delSc' data-idx='" + idx + "'>Delete</button></div>";
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
    window.PRUI.saveStore(); window.PRUI.renderAll(); fillDropdown(); refreshPanelSels();
    window.PRUI.toast("added " + res.added + pStr);
    return sum;
  }
  function wireSubPanels(val){
    var s = window.PRUI.getState();
    if(val === "__exchange") PREditIO.wireExchange(s, applyImportResult);
    else if(val === "__backup") PREditIO.wireBackup(s, render);
  }
  function navigate(target){
    var panel = panelFor(target), sel = document.getElementById("editSel");
    if(!panel) return;
    activePanel = panel;
    if(panel === "tools" && target !== "tools") toolPanel = target;
    if(panel === "vocabulary" && E.ALL_SLOTS.indexOf(target) >= 0){
      fillDropdown();
      if(sel) sel.value = target;
    }
    render();
  }
  function render(){
    fillDropdown();
    var sel = document.getElementById("editSel"), box = document.getElementById("editorBox");
    if(!sel || !box) return;
    var slots = document.getElementById("editSlotWrap"), tools = document.getElementById("editTools");
    if(slots) slots.hidden = activePanel !== "vocabulary";
    if(tools) tools.hidden = activePanel !== "tools";
    document.querySelectorAll("[data-edit-panel]").forEach(function(b){
      b.setAttribute("aria-pressed", String(b.dataset.editPanel === activePanel));
    });
    document.querySelectorAll("[data-edit-tool]").forEach(function(b){
      b.setAttribute("aria-pressed", String(b.dataset.editTool === toolPanel));
    });
    var val = activePanel === "vocabulary" ? (sel.value || "body") :
      activePanel === "tools" ? toolPanel : "__" + activePanel;
    if(val === "__overview"){ box.innerHTML = A.renderInventoryPanel(); return; }
    if(val === "__exchange"){ box.innerHTML = A.renderExchangePanel(); wireSubPanels(val); return; }
    if(val === "__backup"){ box.innerHTML = A.renderBackupPanel(); wireSubPanels(val); return; }
    if(val === "__hooktail"){ box.innerHTML = window.PRHookTail.panel(); window.PRHookTail.wire(render); return; }
    if(val === "__test"){ box.innerHTML = A.renderTestPanel(testResults); return; }
    if(val === "__scenes"){ box.innerHTML = renderScenesEditor(); return; }
    var s = window.PRUI.getState(), list = s.lists[val] || [], q = editQ[val] || "";
    var h = "<div class='hint'><b>" + list.length + " items</b> in [" + (SLOT_NAMES[val]||val) + "] · <span class='dot v'></span>verified · 🔥 spicy · [M:] mood</div>";
    h += "<div class='row' style='margin-bottom:8px'><input type='text' id='searchEdit' placeholder='🔍 search this list...' value='" + esc(q) + "' style='flex:1'></div>";
    h += "<div id='editItemsList'>" + itemsHTML(val, q) + "</div>";
    h += "<textarea id='addSingleBox' placeholder='new item text (leading ! = spicy, * = verified, end with [G: in=indoor] to guard or [M: tease] to set a mood)' style='min-height:70px;margin-top:8px'></textarea>";
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
    var view = document.getElementById("view-edit");
    if(view) view.addEventListener("click", function(e){
      var nav = e.target.closest("[data-edit-panel], [data-edit-tool]");
      if(nav) navigate(nav.dataset.editPanel || nav.dataset.editTool);
    });
    var box = document.getElementById("editorBox");
    if(!box) return;
    box.addEventListener("click", function(e){
      var jump = e.target.closest("[data-jump]");
      if(jump){ navigate(jump.dataset.jump); return; }
      var b = e.target.closest("[data-eact]");
      if(!b) return;
      var act = b.dataset.eact, slot = b.dataset.slot, idx = parseInt(b.dataset.idx, 10), s = window.PRUI.getState();
      if(act === "runtests"){
        testResults = window.PRTest ? window.PRTest.run() : [];
        render();
        var pass = testResults.filter(function(r){ return r.pass; }).length;
        window.PRUI.toast("self-test: " + pass + " / " + testResults.length + " passed");
      }
      else if(act === "exp"){ expanded["i:" + slot + idx] = !expanded["i:" + slot + idx]; render(); }
      else if(act === "del"){
        var item = (s.lists[slot] || [])[idx];
        if(!item || !confirmDelete("item \"" + item.t + "\"")) return;
        s.lists[slot].splice(idx, 1);
        window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("deleted");
      }
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
        if(res.added > 0 || res.presetsAdded > 0){
          // Merge every #list: section found - multi-slot pastes no longer drop items (H3).
          Object.keys(res.itemsByList).forEach(function(k){ s.lists[k] = (s.lists[k]||[]).concat(res.itemsByList[k]); });
          if(res.presets && res.presets.length) s.presets = (s.presets||[]).concat(res.presets);
          ta.value = ""; window.PRUI.saveStore(); window.PRUI.renderAll(); render();
          window.PRUI.toast("added " + res.added + (res.presetsAdded ? " + " + res.presetsAdded + " presets" : ""));
        } else if(res.duplicates > 0) window.PRUI.toast("skipped duplicate");
        else window.PRUI.toast("nothing to add");
      } else if(act === "expSc"){ expanded["sc" + idx] = !expanded["sc" + idx]; render(); }
      else if(act === "applySc"){
        var p = s.presets[idx];
        if(p) window.PRUI.applyPreset(p);
      } else if(act === "delSc"){
        var scene = s.presets[idx];
        if(!scene || !confirmDelete("scene preset \"" + scene.name + "\"")) return;
        s.presets.splice(idx, 1);
        window.PRUI.saveStore(); window.PRUI.renderAll(); render(); window.PRUI.toast("preset deleted");
      }
    });
  }
  window.PREdit = { init: function(){ fillDropdown(); render(); bindEditorClicks(); },
    render: render, fillDropdown: fillDropdown, confirmDelete: confirmDelete,
    navigate: navigate, panelFor: panelFor };
  window.__EOF = window.__EOF || {};
  window.__EOF["editor"] = true;
})();
// EOF-editor.js