// js/storage.js - warn on failed saves, protect unreadable stored data.
(function(){
  var KEY = "prompt_roller_v4_state", protectedSave = false;
  var originalRaw = null, issue = "";
  function el(id){ return document.getElementById(id); }
  function isValid(obj){
    return !!window.PRBackup && PRBackup.verify(obj).ok === true;
  }
  function downloadOriginal(){
    if(originalRaw === null) return;
    var blob = new Blob([originalRaw], { type: "text/plain" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "prompt-roller-original-save.txt"; a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  }
  function show(reason){
    issue = reason;
    var box = el("saveWarning"); if(!box) return;
    box.hidden = !reason;
    if(!reason) return;
    el("saveWarningTitle").textContent = "Your changes are not safely saved";
    el("saveWarningText").textContent = reason === "damaged" ?
      "Stored data could not be read. The original was NOT overwritten. Download the original data, or restore a trusted backup." :
      "Browser storage failed. Changes may disappear after a refresh. Open Edit > Tools > Backup and download your current data.";
    var dl = el("saveDownloadOriginal");
    if(dl){ dl.hidden = originalRaw === null; dl.onclick = downloadOriginal; }
  }
  function load(){
    var raw;
    try { raw = localStorage.getItem(KEY); }
    catch(e){ protectedSave = true; show("unavailable"); return null; }
    if(raw === null) return null;
    try {
      var data = JSON.parse(raw);
      if(!isValid(data)) throw new Error("Invalid saved state");
      return data;
    } catch(e){
      originalRaw = raw; protectedSave = true;
      show("damaged"); return null;
    }
  }
  function save(state, allowRestore){
    if(protectedSave && !allowRestore) return false;
    try {
      var json = JSON.stringify(state);
      localStorage.setItem(KEY, json);
      if(localStorage.getItem(KEY) !== json) throw new Error("Storage did not keep write");
      protectedSave = false; originalRaw = null; show("");
      return true;
    } catch(e){ show("unavailable"); return false; }
  }
  window.PRStorage = { load: load, save: save, isValid: isValid,
    getIssue: function(){ return issue; } };
  window.__EOF = window.__EOF || {};
  window.__EOF["storage"] = true;
})();
// EOF-storage.js
