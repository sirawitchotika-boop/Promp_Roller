// js/batch.js - Batch Roller (10 Prompts) & Saved Prompt Library
(function(){
  var E = window.PREngine;
  var batchItems = [];
  var batchIdx = 0;
  var expanded = {};
  var libCopied = {};
  var UNIQUE_SLOTS = ["hairC", "hairS", "eyes"];

  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function shuffle(a){
    a = a.slice();
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function gen(mode){
    var s = window.PRUI.getState();
    var hasChain = !!(window.PRRoll && PRRoll.rollScene);
    var baseCtx = hasChain ? PRRoll.ctxFromCurrent(s.lists, s.current) : null;
    var uniq = {};
    UNIQUE_SLOTS.forEach(function(slot){
      if(!s.locked[slot]){
        var pool = (s.lists[slot] || []).filter(function(it){ return s.spicy || !it.x; });
        uniq[slot] = shuffle(pool);
      }
    });

    batchItems = [];
    for(var i = 0; i < 10; i++){
      var vals = {}, ctx = baseCtx;
      if(mode !== "subject" && hasChain){
        var scene = PRRoll.rollScene(s.lists, s.spicy, s.locked, s.current);
        E.SLOTS_SCENE.forEach(function(slot){ vals[slot] = scene.vals[slot] || s.current[slot] || ""; });
        ctx = scene.ctx;
      } else {
        E.SLOTS_SCENE.forEach(function(slot){ vals[slot] = s.current[slot] || ""; });
      }
      E.SLOTS_SUBJECT.forEach(function(slot){
        if(s.locked[slot]){ vals[slot] = s.current[slot] || ""; return; }
        if(uniq[slot] && uniq[slot].length){ vals[slot] = uniq[slot][i % uniq[slot].length].t; return; }
        if(slot === "outfit" && hasChain){
          var gPick = PRRoll.pickGuarded(s.lists.outfit, s.spicy, ctx);
          vals[slot] = gPick ? gPick.t : E.pickSlot(s.lists.outfit, s.spicy);
        } else {
          vals[slot] = E.pickSlot(s.lists[slot], s.spicy);
        }
      });
      var txt = E.buildPrompt(vals);
      batchItems.push({ values: vals, text: txt, copied: false });
    }
    batchIdx = 0;
    renderBatch();
    window.PRUI.toast("rolled 10 batch prompts");
  }

  function renderBatch(){
    var out = document.getElementById("batchOut");
    var qa = document.getElementById("batchQA");
    if(!out) return;
    var n = batchItems.length;
    if(!n){
      out.innerHTML = "<div class='hint'>No batch yet. Tap Rotate all (10) or Subject only (10) above — hair color, hairstyle and eyes never repeat inside a batch.</div>";
      if(qa) qa.textContent = "";
      return;
    }
    if(batchIdx < 0) batchIdx = 0;
    if(batchIdx >= n) batchIdx = n - 1;

    var it = batchItems[batchIdx];
    var warns = E.validate(it.values, it.text);
    var h = "<div class='card'>";
    h += "<div class='bhead'>#" + (batchIdx + 1) + " / " + n + " · " + it.text.length + " chars";
    if(warns.length) h += " · <span class='flag'>⚠ " + warns.length + " warning(s)</span>";
    h += "</div>";
    h += "<div class='btext" + (expanded["b:"+batchIdx] ? " full" : "") + "' data-bact='bexp'>" + esc(it.text) + "</div>";
    if(warns.length) h += "<div class='note'>" + warns.map(esc).join("<br>") + "</div>";
    h += "<div class='row' style='margin-top:10px; margin-bottom:0'>";
    h += "<button class='btn sm' data-bact='bprev'" + (batchIdx === 0 ? " disabled" : "") + ">◀ Prev</button>";
    h += "<button class='btn sm' data-bact='bcopy' style='flex:1; background:var(--acc)'>" + (it.copied ? "✓ Copied" : "📋 Copy #" + (batchIdx + 1)) + "</button>";
    h += "<button class='btn sm' data-bact='bnext'" + (batchIdx === n - 1 ? " disabled" : "") + ">Next ▶</button>";
    h += "</div></div>";
    out.innerHTML = h;

    var warnIndices = [];
    batchItems.forEach(function(item, idx){
      if(E.validate(item.values, item.text).length) warnIndices.push("#" + (idx + 1));
    });
    if(qa){
      qa.textContent = warnIndices.length ? ("Cards with warnings: " + warnIndices.join(", ")) : "✓ All 10 batch prompts clean (0 warnings)";
    }
  }

  function copyAll(){
    if(!batchItems.length){ window.PRUI.toast("roll a batch first"); return; }
    var txt = batchItems.map(function(it, i){ return (i + 1) + ") " + it.text; }).join("\n\n");
    batchItems.forEach(function(it){ it.copied = true; });
    renderBatch();
    window.PRUI.copy(txt, "copied all 10 prompts!");
  }

  function saveLib(){
    var s = window.PRUI.getState();
    var nameIn = document.getElementById("libName");
    var name = (nameIn ? nameIn.value : "").trim() || ("Prompt #" + (s.library.length + 1));
    var vals = {};
    E.ALL_SLOTS.forEach(function(k){ vals[k] = s.current[k] || ""; });
    var txt = E.buildPrompt(vals);
    s.library.push({ id: "L" + Date.now(), ts: Date.now(), name: name, values: vals, text: txt });
    if(nameIn) nameIn.value = "";
    window.PRUI.saveStore();
    renderLib();
    window.PRUI.toast("saved to library");
  }

  function renderLib(){
    var box = document.getElementById("libList");
    if(!box) return;
    var s = window.PRUI.getState();
    var qEl = document.getElementById("libSearch");
    var q = (qEl ? qEl.value : "").toLowerCase();
    var list = (s.library || []).slice().reverse().filter(function(it){
      return !q || it.name.toLowerCase().indexOf(q) >= 0 || it.text.toLowerCase().indexOf(q) >= 0;
    });
    if(!list.length){
      box.innerHTML = "<div class='hint'>Nothing saved yet. Build a prompt on the Roll tab, then save it here.</div>";
      return;
    }
    var h = "";
    list.forEach(function(it){
      var exp = expanded["l:" + it.id];
      var dStr = new Date(it.ts).toISOString().slice(0, 10);
      h += "<div class='item'><div class='tx" + (exp ? " full" : "") + "' data-lact='lexp' data-id='" + it.id + "'>";
      h += "<b>" + esc(it.name) + "</b> <span class='badge'>" + dStr + " · " + it.text.length + "c</span>";
      h += "<div style='color:var(--dim);font-size:12px;margin-top:4px'>" + esc(it.text) + "</div></div>";
      h += "<button class='btn sm' data-lact='lcopy' data-id='" + it.id + "'>" + (libCopied[it.id] ? "✓" : "📋") + "</button>";
      h += "<button class='btn sm' data-lact='lload' data-id='" + it.id + "' title='Load into Roll tab'>↩</button>";
      h += "<button class='x' data-lact='ldel' data-id='" + it.id + "'>✕</button></div>";
    });
    box.innerHTML = h;
  }

  function bindEvents(){
    var bOut = document.getElementById("batchOut");
    if(bOut){
      bOut.addEventListener("click", function(e){
        var b = e.target.closest("[data-bact]");
        if(!b) return;
        var act = b.dataset.bact;
        if(act === "bexp"){ expanded["b:" + batchIdx] = !expanded["b:" + batchIdx]; renderBatch(); }
        else if(act === "bprev"){ batchIdx--; renderBatch(); }
        else if(act === "bnext"){ batchIdx++; renderBatch(); }
        else if(act === "bcopy"){
          var it = batchItems[batchIdx];
          if(it){ it.copied = true; renderBatch(); window.PRUI.copy(it.text, "copied #" + (batchIdx + 1)); }
        }
      });
    }
    var lOut = document.getElementById("libList");
    if(lOut){
      lOut.addEventListener("click", function(e){
        var b = e.target.closest("[data-lact]");
        if(!b) return;
        var act = b.dataset.lact, id = b.dataset.id, s = window.PRUI.getState();
        var it = (s.library || []).find(function(x){ return x.id === id; });
        if(!it) return;
        if(act === "lexp"){ expanded["l:" + id] = !expanded["l:" + id]; renderLib(); }
        else if(act === "lcopy"){ libCopied[id] = true; renderLib(); window.PRUI.copy(it.text, "copied prompt"); }
        else if(act === "lload"){
          E.ALL_SLOTS.forEach(function(k){ if(it.values[k] !== undefined) s.current[k] = it.values[k]; });
          window.PRUI.saveStore(); window.PRUI.renderAll(); window.showTab("roll");
          window.PRUI.toast("loaded into Roll tab");
        } else if(act === "ldel"){
          s.library = s.library.filter(function(x){ return x.id !== id; });
          window.PRUI.saveStore(); renderLib(); window.PRUI.toast("deleted");
        }
      });
    }
  }

  window.PRBatch = { init: function(){ renderBatch(); renderLib(); bindEvents(); }, gen: gen, renderBatch: renderBatch, copyAll: copyAll, saveLib: saveLib, renderLib: renderLib };
  window.__EOF = window.__EOF || {};
  window.__EOF["batch"] = true;
})();
// EOF-batch.js