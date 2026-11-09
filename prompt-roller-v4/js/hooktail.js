// js/hooktail.js - Hook & Tail Editor (user-editable prompt head/tail lines)
// Hook = fixed style line at the front of every prompt.
// Tail = fixed closing line. Both live in saved state (localStorage),
// so they survive app file updates and ride inside backup .json files.
(function(){
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function seed(){
    var R = window.PR_RULES, s = window.PRUI.getState();
    if(!R.__DEF_HOOK) R.__DEF_HOOK = R.HOOK;
    if(!R.__DEF_TAIL) R.__DEF_TAIL = R.TAIL;
    var changed = false;
    if(s.hook === undefined){ s.hook = R.__DEF_HOOK; changed = true; }
    if(s.tail === undefined){ s.tail = R.__DEF_TAIL; changed = true; }
    if(changed) window.PRUI.saveStore();
    sync();
  }
  function sync(){
    var R = window.PR_RULES, s = window.PRUI.getState();
    if(s.hook !== undefined) R.HOOK = s.hook;
    if(s.tail !== undefined) R.TAIL = s.tail;
  }
  function panel(){
    var s = window.PRUI.getState();
    var h = "<div class='hint'>Hook = fixed style line at the front of every prompt. Tail = fixed closing line. Saved in your data - survives app updates and backups.</div>";
    h += "<div class='sect' style='margin-top:8px'>Hook</div>";
    h += "<textarea id='hookBox' style='min-height:70px'>" + esc(s.hook) + "</textarea>";
    h += "<div class='sect'>Tail</div>";
    h += "<textarea id='tailBox' style='min-height:70px'>" + esc(s.tail) + "</textarea>";
    h += "<div class='row' style='margin-top:8px'>";
    h += "<button class='btn sm' id='btnSaveHookTail'>💾 Save</button>";
    h += "<button class='btn sm danger' id='btnResetHookTail'>↺ Reset to defaults</button></div>";
    h += "<div class='hint'>After Save, roll once (or tap ↻ Rebuild) to see the new lines in the prompt.</div>";
    return h;
  }
  function wire(rerender){
    var s = window.PRUI.getState(), R = window.PR_RULES;
    document.getElementById("btnSaveHookTail").onclick = function(){
      var hk = document.getElementById("hookBox").value.trim();
      var tl = document.getElementById("tailBox").value.trim();
      var mh = window.PREngine.checkMinors(hk), mt = window.PREngine.checkMinors(tl);
      if(mh || mt){ alert("BLOCKED: minors word '" + (mh || mt) + "' is strictly prohibited."); return; }
      s.hook = hk; s.tail = tl;
      window.PRUI.saveStore(); sync();
      window.PRUI.renderAll();
      if(rerender) rerender();
      window.PRUI.toast("hook & tail saved");
    };
    document.getElementById("btnResetHookTail").onclick = function(){
      if(!confirm("Reset hook & tail to factory defaults?")) return;
      s.hook = R.__DEF_HOOK || R.HOOK;
      s.tail = R.__DEF_TAIL || R.TAIL;
      window.PRUI.saveStore(); sync();
      window.PRUI.renderAll();
      if(rerender) rerender();
      window.PRUI.toast("hook & tail reset");
    };
  }
  window.PRHookTail = { seed: seed, sync: sync, panel: panel, wire: wire };
  window.__EOF = window.__EOF || {};
  window.__EOF["hooktail"] = true;
})();
// EOF-hooktail.js