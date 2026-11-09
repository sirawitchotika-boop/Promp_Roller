// js/render.js - Roll Tab View Rendering (split from ui.js, v4.4 Day 3)
// Reads state through PRUI.getState() at call time - owns no state itself.
(function(){
  var E = window.PREngine;

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
      var label = (window.PRAsk && PRAsk.SLOT_NAMES[slot]) || slot;
      var row = document.createElement("div");
      row.className = "slot" + (isLock ? " locked" : "");
      row.dataset.slot = slot;
      row.innerHTML = "<div class='sname'>" + esc(label) + "</div>" +
        "<button type='button' class='sval' data-act='edit' aria-label='Edit " + esc(label) + "'>" +
          (isCust ? "<span class='slot-custom'>Custom</span> " : "") + esc(val) + "</button>" +
        "<div class='sact'>" +
        "<button type='button' class='btn sm lk" + (isLock ? " on" : "") +
          "' data-act='lock' aria-pressed='" + isLock + "' aria-label='" +
          (isLock ? "Unlock " : "Lock ") + esc(label) + "'>" + (isLock ? "Locked" : "Lock") + "</button>" +
        "<button type='button' class='btn sm dice' data-act='roll' aria-label='Reroll " + esc(label) + "'>↻</button>" +
        "</div>";
      c.appendChild(row);
    });
  }

  var lastBuilt = null;
  function shouldReplaceDraft(previous, text, force){
    return !!force || previous === null || text === previous;
  }
  function isEdited(){
    var out = document.getElementById("out");
    return !!out && !shouldReplaceDraft(lastBuilt, out.value, false);
  }
  function confirmReplace(){
    return !isEdited() || confirm("Replace your hand-edited Prompt Output? Your edits cannot be undone.");
  }
  function renderPrompt(force){
    var S = window.PRUI.getState();
    var full = E.buildPrompt(S.current);
    var out = document.getElementById("out");
    if(out && shouldReplaceDraft(lastBuilt, out.value, force)){
      out.value = full;
      lastBuilt = full;
    }
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
    var draft = document.getElementById("draftStatus");
    if(draft) draft.hidden = !isEdited();
    var cnt = document.getElementById("counter");
    if(cnt){
      var wCount = full.trim() ? full.trim().split(/\s+/).length : 0;
      cnt.textContent = full.length + " chars · " + wCount + " words";
    }
  }

  // A saved preset is current only if all four scene values match.
  function sceneName(presets, current){
    var match = (presets || []).filter(function(p){
      return p && p.values && E.SLOTS_SCENE.every(function(k){
        return p.values[k] === (current || {})[k];
      });
    })[0];
    return match ? match.name : "";
  }

  // Preset dropdown: SFW mode hides spicy; a selected mood hides differently-tagged presets.
  function renderPresets(){
    var S = window.PRUI.getState();
    var sel = document.getElementById("presetSel");
    if(!sel) return;
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
    // The current scene wins over a stale dropdown choice.
    var previousMatches = previous !== null && E.SLOTS_SCENE.every(function(k){
      return S.presets[parseInt(previous, 10)].values[k] === S.current[k];
    });
    var chosen = previousMatches ? previous : (matching || previous);
    if(chosen !== null) sel.value = chosen;
    var currentName = previousMatches ? S.presets[Number(previous)].name :
      sceneName(S.presets, S.current);
    var status = document.getElementById("sceneStatus");
    if(status) status.textContent = currentName ? "Current scene: " + currentName :
      "Current scene: Custom values";
    var apply = document.getElementById("btnApplyPreset");
    if(apply) apply.disabled = !sel.options.length;
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

  function renderAll(forcePrompt){
    window.PRUI.getState(); // runs normMode()
    renderSlots("slotsSubject", E.SLOTS_SUBJECT);
    renderSlots("slotsScene", E.SLOTS_SCENE);
    renderPresets();
    renderMoodSel();
    renderPrompt(forcePrompt);
    var S = window.PRUI.getState();
    var seg = document.getElementById("modeSeg");
    if(seg) seg.querySelectorAll(".mbtn").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-mode") === S.mode); });
  }

  window.PRRender = { renderAll: renderAll, renderPrompt: renderPrompt,
    onOutEdit: onOutEdit, confirmReplace: confirmReplace, shouldReplaceDraft: shouldReplaceDraft,
    sceneName: sceneName };
  window.__EOF = window.__EOF || {};
  window.__EOF["render"] = true;
})();
// EOF-render.js