// js/editor-io.js - Exchange & Backup Panel Wiring (split from editor.js, v4.1 Phase 7)
(function(){
  var E = window.PREngine, A = window.PRAsk;

  // Shared timestamp (YYYYMMDD-HHMMSS) for every downloaded file name.
  function p2(n){ return (n < 10 ? "0" : "") + n; }
  function stamp(){
    var d = new Date();
    return "" + d.getFullYear() + p2(d.getMonth()+1) + p2(d.getDate()) + "-" + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
  }

  function wireExchange(s, applyImportResult){
    var slotSel = document.getElementById("exSlotSel");
    function curSlot(){ return slotSel.value || null; }
    document.getElementById("btnExCopySlot").onclick = function(){
      var slot = curSlot();
      window.PRUI.copy(E.exportText(s.lists, slot, s.presets), "copied " + (slot || "all"));
    };
    document.getElementById("btnExDownload").onclick = function(){
      var slot = curSlot();
      var txt = E.exportText(s.lists, slot, s.presets);
      var blob = new Blob([txt], { type: "text/plain" }), u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = "prompt-roller-io-" + (slot || "all") + "-" + stamp() + ".txt"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); }, 1500);
      window.PRUI.toast("downloaded " + (slot || "all"));
    };
    document.getElementById("btnExCopyReq").onclick = function(){
      var slot = curSlot();
      if(!slot){ alert("Pick a specific slot from the dropdown first (not Auto-detect)."); return; }
      var n = parseInt(document.getElementById("exCountSel").value, 10) || 30;
      var spicy = document.getElementById("exSpicyChk").checked;
      var theme = (document.getElementById("exThemeIn").value || "").trim();
      window.PRUI.copy(A.buildAskRequest(slot, n, spicy, theme), "AI request copied!");
    };
    document.getElementById("btnExImport").onclick = function(){
      var box = document.getElementById("exBox"), slot = curSlot();
      var res = E.parseImport(box.value, slot, s.lists, s.presets);
      document.getElementById("exOut").textContent = applyImportResult(res, box);
    };
    document.getElementById("btnExPickFile").onclick = function(){ document.getElementById("fileExIn").click(); };
    document.getElementById("fileExIn").onchange = function(ev){
      var f = ev.target.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(evt){
        document.getElementById("exBox").value = evt.target.result;
        window.PRUI.toast("file loaded - check the box, then Import lines");
      };
      r.readAsText(f);
    };
    document.getElementById("btnExClearBox").onclick = function(){
      document.getElementById("exBox").value = ""; document.getElementById("exOut").textContent = "";
    };
  }

  function wireBackup(s, rerender){
    document.getElementById("btnDlBackup").onclick = function(){
      var blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = "prompt-roller-backup-" + stamp() + ".json"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); }, 1500);
    };
    document.getElementById("btnPickBackup").onclick = function(){ document.getElementById("fileBackupIn").click(); };
    document.getElementById("fileBackupIn").onchange = function(ev){
      var f = ev.target.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(evt){
        try {
          var parsed = JSON.parse(evt.target.result);
          var check = window.PRBackup.verify(parsed);
          if(!check.ok){ alert(check.error); return; }
          var partial = !parsed.current || !parsed.locked || !parsed.custom || !parsed.presets;
          var warning = "Restore will REPLACE your current saved lists, presets, locks, and scene. Download a full backup first.";
          if(partial) warning += "\nThis file is partial; missing fields will be reset.";
          if(!confirm(warning + "\nContinue?")) return;
          var restore = window.PRBackup.restore(parsed, s);
          if(!restore.ok){ alert(restore.error); return; }
          window.PRUI.saveStore();
          if(window.PRHookTail) window.PRHookTail.seed();
          window.PRUI.renderAll(); rerender(); alert("Backup restored!");
        }
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

  window.PREditIO = { wireExchange: wireExchange, wireBackup: wireBackup };
  window.__EOF = window.__EOF || {};
  window.__EOF["editor-io"] = true;
})();
// EOF-editor-io.js