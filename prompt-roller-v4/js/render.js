// js/render.js - Roll Tab View Rendering (split from ui.js, v4.4 Day 3)
// Reads state through PRUI.getState() at call time - owns no state itself.
(function(){
  var E = window.PREngine, lastRenderedScene = null;

  function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  // Slot values are user data - always escaped before innerHTML.
  function renderSlots(containerId, slots){
    var S = window.PRUI.getState();
    var c = document.getElementById(containerId);
    if(!c) return;
    c.innerHTML = "";
    slots.forEach(function(slot){
      var isLock = !!S.locked[slot], isCust = !!S.custom[slot];
      var val = S.current[slot] || "- empty -";
      var row = document.createElement("div");
      row.className = "slot" + (isLock ? " locked" : "");
      row.dataset.slot = slot;
      row.innerHTML = "<div class='sname'>" + slot + "</div>" +
        "<div class='sval' data-act='edit'>" + (isCust ? "<span class='badge'>CUSTOM</span> " : "") + esc(val) + "</div>" +
        "<div class='sact'>" +
        "<button class='btn sm lk" + (isLock ? " on" : "") + "' data-act='lock'>" + (isLock ? "LOCKED" : "Lock") + "</button>" +
        "<button class='btn sm' data-act='roll'>🎲</button>" +
        "</div>";
      c.appendChild(row);
    });
  }

  function renderPrompt(){
    var S = window.PRUI.getState();
    var full = E.buildPrompt(S.current);
    var out = document.getElementById("out");
    if(out) out.value = full;
    onOutEdit();
  }

  function onOutEdit(){
    var S = window.PRUI.getState();
    var out = document.getElementById("out"), full = out ? out.value : "";
    var warns = E.validate(S.current, full), wBox = document.getElementById("warns");
    if(wBox){
      wBox.innerHTML = warns.length ? warns.join("<br>") : "";
      wBox.style.display = warns.length ? "block" : "none";
    }
    var cnt = document.getElementById("counter");
    if(cnt){
      var wCount = full.trim() ? full.trim().split(/\s+/).length : 0;
      cnt.textContent = full.length + " chars · " + wCount + " words";
    }
  }

  // Preset dropdown: SFW mode hides spicy; a selected mood hides differently-tagged presets.
  function renderPresets(){
    var S = window.PRUI.getState();
    var sel = document.getElementById("presetSel");
    if(!sel) return;
    var scene = E.SLOTS_SCENE.map(function(k){ return S.current[k] || ""; }).join("|");
    var oldValue = sel.value;
    var oldOption = sel.options && sel.options[sel.selectedIndex];
    var oldLabel = oldOption ? oldOption.textContent : "";
    var previous = null, matching = null;
    sel.innerHTML = "";
    (S.presets || []).forEach(function(p, i){
      if(!p || !p.values) return;
      if((S.mode === "sfw" && p.x) || (S.mood && S.mood !== "any" && p.m && p.m !== S.mood)) return;
      var opt = document.createElement("option");
      opt.value = i; opt.textContent = p.name + (p.x ? " [Spicy]" : "") + (p.m ? " [" + p.m + "]" : "");
      sel.appendChild(opt);
      if(String(i) === oldValue && opt.textContent === oldLabel) previous = String(i);
      if(matching === null && E.SLOTS_SCENE.every(function(k){ return p.values[k] === S.current[k]; }))
        matching = String(i);
    });
    var chosen = scene === lastRenderedScene ? (previous || matching) : (matching || previous);
    if(chosen !== null) sel.value = chosen;
    lastRenderedScene = scene;
  }

  // Mood dropdown: "Any mood" + the 6 built-in moods + the saved mood if custom.
  function renderMoodSel(){
    var S = window.PRUI.getState();
    var ms = document.getElementById("moodSel");
    if(!ms) return;
    var cur = S.mood || "any";
    var list = ["any"].concat((window.PRRoll && PRRoll.MOODS) || []);
    if(cur !== "any" && list.indexOf(cur) < 0) list.push(cur);
    ms.innerHTML = list.map(function(m){
      return "<option value='" + esc(m) + "'>" + (m === "any" ? "Any mood" : esc(m.charAt(0).toUpperCase() + m.slice(1))) + "</option>";
    }).join("");
    ms.value = cur;
  }

  function renderAll(){
    window.PRUI.getState(); // runs normMode()
    renderSlots("slotsSubject", E.SLOTS_SUBJECT);
    renderSlots("slotsScene", E.SLOTS_SCENE);
    renderPresets();
    renderMoodSel();
    renderPrompt();
    var S = window.PRUI.getState();
    var seg = document.getElementById("modeSeg");
    if(seg) seg.querySelectorAll(".mbtn").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-mode") === S.mode); });
  }

  window.PRRender = { renderAll: renderAll, renderPrompt: renderPrompt, onOutEdit: onOutEdit };
  window.__EOF = window.__EOF || {};
  window.__EOF["render"] = true;
})();
// EOF-render.js