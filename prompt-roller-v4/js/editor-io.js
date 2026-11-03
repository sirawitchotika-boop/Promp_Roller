// js/editor-io.js - IO & Backup Panel Wiring (split from editor.js, v4.1 Phase 7)
(function(){
  var E = window.PREngine, A = window.PRAsk, SLOT_NAMES = A.SLOT_NAMES;

  function wireAsk(s, applyImportResult){
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
  }

  function wireIO(s, applyImportResult, rerender){
    document.getElementById("btnIoImport").onclick = function(){
      var box = document.getElementById("ioBox"), slot = document.getElementById("ioSlotSel").value || null;
      var res = E.parseImport(box.value, slot, s.lists, s.presets);
      document.getElementById("ioOut").textContent = applyImportResult(res, box);
    };
    document.getElementById("btnIoPickFile").onclick = function(){ document.getElementById("fileIoIn").click(); };
    document.getElementById("fileIoIn").onchange = function(ev){
      var f = ev.target.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(evt){
        document.getElementById("ioBox").value = evt.target.result;
        window.PRUI.toast("file loaded - check the box, then Import lines");
      };
      r.readAsText(f);
    };
    document.getElementById("btnIoClearBox").onclick = function(){
      document.getElementById("ioBox").value = ""; document.getElementById("ioOut").textContent = "";
    };
    document.getElementById("btnIoDownload").onclick = function(){
      var slot = document.getElementById("ioSlotSel").value || null;
      var txt = E.exportText(s.lists, slot, s.presets);
      var d = new Date(); function p(n){ return (n < 10 ? "0" : "") + n; }
      var stamp = "" + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
      var blob = new Blob([txt], { type: "text/plain" }), u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = "prompt-roller-io-" + (slot || "all") + "-" + stamp + ".txt"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); }, 1500);
      window.PRUI.toast("downloaded " + (slot || "all"));
    };
    document.getElementById("btnIoClearSlot").onclick = function(){
      var slot = document.getElementById("ioSlotSel").value;
      if(!slot){ alert("Pick a specific slot from the dropdown first to clear it."); return; }
      if(confirm("Clear all " + (s.lists[slot]||[]).length + " items from [" + (SLOT_NAMES[slot]||slot) + "]?")){
        s.lists[slot] = []; s.current[slot] = ""; delete s.custom[slot];
        window.PRUI.saveStore(); window.PRUI.renderAll(); rerender(); window.PRUI.toast("cleared " + slot);
      }
    };
  }

  function wireBackup(s, rerender){
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
        try { Object.assign(s, JSON.parse(evt.target.result)); window.PRUI.saveStore(); window.PRUI.renderAll(); rerender(); alert("Backup restored!"); }
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

  window.PREditIO = { wireAsk: wireAsk, wireIO: wireIO, wireBackup: wireBackup };
  window.__EOF = window.__EOF || {};
  window.__EOF["editor-io"] = true;
})();
// EOF-editor-io.js