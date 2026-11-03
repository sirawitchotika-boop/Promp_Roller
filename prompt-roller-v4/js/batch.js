// js/batch.js - Batch Roller (10 Prompts)
(function(){
  var E = window.PREngine;
  var batchItems = [];
  var batchIdx = 0;
  var expanded = {};
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

  function bindEvents(){
    var bOut = document.getElementById("batchOut");
    if(!bOut) return;
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

  window.PRBatch = { init: function(){ renderBatch(); bindEvents(); }, gen: gen, renderBatch: renderBatch, copyAll: copyAll };
  window.__EOF = window.__EOF || {};
  window.__EOF["batch"] = true;
})();
// EOF-batch.js