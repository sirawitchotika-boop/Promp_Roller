// js/ask.js - Exchange Panel (Export / Ask AI / Import), Inventory, Backup & Self-Test Panels (v4.3)
(function(){
  var E = window.PREngine;
  var R = window.PR_RULES;
  var SLOT_NAMES = {
    body: "Body tier", hairC: "Hair color", hairS: "Hairstyle", eyes: "Eye color",
    skin: "Skin", face: "Face / mood", outfit: "Outfit", camera: "Camera",
    action: "Action", hands: "Hands", light: "Light", prop: "Story prop",
    venue: "Venue", depth: "Depth"
  };

  var ASK_RULES = {
    body: "Each item is one full body type description in a single line (curvy fit body, big bust, slim waist, wide hips). No chubby body types.",
    hairC: "Each item is a hair color only, 1-3 words (black, honey-blonde, teal dyed).",
    hairS: "Each item describes one hairstyle. Use the placeholder {c} where the hair color goes (her {c} hair in a high ponytail). Keep each item under 15 words.",
    eyes: "Each item is an eye color only, 2-3 words (brown eyes, ice-blue eyes).",
    skin: "Each item is a skin tone only, 2-3 words (fair skin, golden tan skin). Never the word pale.",
    face: "Each item is a facial expression caught mid-emotion plus ONE asymmetry detail (smiling mid-word, one eyebrow raised higher than the other).",
    outfit: "Every fabric color must be locked (black lace, red ribbon, denim) - never leave a color empty. Clothing state uses visible verbs: pulled down, unbuttoned, tied at her waist. Every bare skin spot needs the word bare in front of it.",
    camera: "Each item describes what the camera frame sees, never the words camera or lens (seen from the floor at her bare feet, her head far above). No mirrors.",
    action: "Each item is one mid-action moment with a motion verb (she is mid-step, her hips swinging).",
    hands: "Each item describes both hands, left and right, each hand busy with something (her left hand in her hair, her right hand holding a drink).",
    light: "Each item is one light setup with a color and a steady source (warm late afternoon sun on her skin, long soft shadows). No flickering flames.",
    prop: "Each item is one small story prop, a real messy object (a towel dropped on the tiles, a gym bag open on the floor).",
    venue: "Each item is a short place phrase starting with in or on (in a small night kitchen, on a rooftop balcony). Real places only, no fantasy locations.",
    depth: "Each item describes the background compressed far away behind her (the city skyline compressed far behind her)."
  };

  // One builder for every slot dropdown (withAuto = prepend the Auto-detect option)
  function slotOptionsHTML(withAuto){
    var s = window.PRUI.getState();
    var h = withAuto ? "<option value=''>Auto-detect (#list: header)</option>" : "";
    E.ALL_SLOTS.forEach(function(slot){
      h += "<option value='" + slot + "'>" + (SLOT_NAMES[slot]||slot) + " (" + (s.lists[slot]||[]).length + ")</option>";
    });
    return h;
  }

  function buildAskRequest(slot, n, spicy, theme){
    var s = window.PRUI.getState(), items = (s.lists[slot] || []), lines = [];
    lines.push("You write items for an AI image prompt app (SDXL base, 2.5D semi-realistic style, young adult women 21-23).");
    lines.push("");
    lines.push("TASK: Write " + n + " " + (SLOT_NAMES[slot] || slot) + " items" + (theme ? " with theme/direction: [" + theme + "]." : "."));
    lines.push("");
    lines.push("FORMAT RULES:");
    lines.push("- One item per line, plain simple English, no numbering, no bullet points");
    if(spicy) lines.push("- Start spicy items with ! at the front of the line");
    else lines.push("- All items are fully clothed everyday content, no explicit content");
    lines.push("- End an item with a guard tag when it only fits one situation: [G: in=indoor] or [G: in=outdoor, day=day] or [G: face=front] / [G: face=rear]. Items that fit anywhere get no tag.");
    lines.push("- End an item with a mood tag when it carries one strong feeling: " + PRRoll.MOODS.map(function(m){ return "[M: " + m + "]"; }).join(" / ") + ". Neutral items that fit any mood get no tag.");
    lines.push("- If a file is attached OR a #list: block is pasted in this message, it lists all my current items. Write only NEW items - none may duplicate or closely match that list.");
    lines.push("- Output ONLY one codeblock with all " + n + " lines, no explanations before or after");
    lines.push("- The first line inside the codeblock must be exactly: #list: " + slot);
    lines.push("");
    lines.push("WRITING RULES:");
    lines.push("- " + (ASK_RULES[slot] || "Keep each item short and visual, simple words."));
    lines.push("- Never use these words: " + R.BANNED.map(function(p){ return p[0]; }).join(", "));
    lines.push("- All subjects are adult women, no minors, no school settings");
    lines.push("");

    var ex = [];
    if(spicy){ var sp = items.filter(function(it){ return it.x; }); if(sp.length) ex.push(sp[0]); }
    items.filter(function(it){ return ex.indexOf(it) < 0; }).slice(0, 3 - ex.length).forEach(function(it){ ex.push(it); });
    if(ex.length){
      lines.push("STYLE EXAMPLES (match this style):");
      ex.forEach(function(it){ lines.push((it.x ? "!" : "") + it.t + (it.g ? PRRoll.guardText(it.g) : "") + (it.m ? " [M: " + it.m + "]" : "")); });
      lines.push("");
      lines.push("Write " + n + " new items in this exact style, different from the examples.");
    }
    return lines.join("\n");
  }

  // ONE panel: export -> request -> answer import, all sharing one slot dropdown
  function renderExchangePanel(){
    var h = "<div class='hint'>One screen for the AI round trip: export a slot, build the request, paste the answer back. Auto-detect = all 14 slots + presets.</div>";
    h += "<div class='row'><select id='exSlotSel' style='flex:1'>" + slotOptionsHTML(true) + "</select></div>";
    h += "<div class='sect' style='margin-top:8px'>Export</div>";
    h += "<div class='row'><button class='btn sm' id='btnExCopySlot'>📋 Copy slot</button>";
    h += "<button class='btn sm' id='btnExDownload' style='background:var(--acc)'>📤 Download .txt</button></div>";
    h += "<div class='sect' style='margin-top:12px'>Ask AI</div>";
    h += "<div class='row'>";
    h += "<select id='exCountSel' style='width:95px;flex:none'><option value='10'>10 items</option><option value='30' selected>30 items</option><option value='50'>50 items</option></select>";
    h += "<input type='text' id='exThemeIn' placeholder='optional theme (e.g. cyberpunk, office)' style='flex:1'></div>";
    h += "<div class='row' style='align-items:center'><label class='spicy' style='flex:1'><input type='checkbox' id='exSpicyChk' checked> include spicy (!)</label>";
    h += "<button class='btn sm' id='btnExCopyReq'>📋 Copy request</button></div>";
    h += "<div class='sect' style='margin-top:12px'>Import</div>";
    h += "<textarea id='exBox' placeholder='paste items or an AI answer codeblock here\n#list: light\nwarm ceiling lamp glow [G: in=indoor, day=night]\n!spicy item [M: tease]' style='min-height:120px'></textarea>";
    h += "<div class='row' style='margin-top:8px'><button class='btn sm' id='btnExImport' style='background:var(--acc)'>📥 Import lines</button>";
    h += "<button class='btn sm' id='btnExPickFile'>📂 Import file</button>";
    h += "<button class='btn sm' id='btnExClearBox'>✕ Clear box</button>";
    h += "<input type='file' id='fileExIn' style='display:none' accept='.txt,.md'></div>";
    h += "<div id='exOut' class='hint'></div>";
    return h;
  }

  function renderBackupPanel(){
    var h = "<div class='hint'>Download full state as a .json file to your Downloads folder, or restore from a backup file.</div>";
    h += "<div class='row' style='margin-top:8px'><button class='btn sm' id='btnDlBackup'>⬇ Download backup (.json)</button>";
    h += "<button class='btn sm' id='btnPickBackup'>📂 Choose backup file</button>";
    h += "<input type='file' id='fileBackupIn' style='display:none' accept='.json,.txt'></div>";
    h += "<div class='sect' style='margin-top:12px'>Danger Zone</div>";
    h += "<div class='row'><button class='btn sm danger' id='btnResetAll'>↺ Restore all factory defaults</button></div>";
    return h;
  }

  function renderTestPanel(ran){
    var h = "<div class='hint'>Fixture suite — one tap, no typing. Runs on throwaway data, never touches your real lists.</div>";
    h += "<div class='row' style='align-items:center;margin:8px 0'><button class='btn sm' data-eact='runtests' style='background:var(--acc)'>▶ Run all tests</button></div>";
    if(!ran) return h + "<div id='testOut' class='hint'>Tap ▶ Run all tests above to execute the suite.</div>";
    var list = window.PRTest ? window.PRTest.run() : [];
    var pass = list.filter(function(r){ return r.pass; }).length;
    var timeStr = new Date().toTimeString().slice(0, 8);
    h += "<div class='hint' style='color:" + (pass === list.length ? "var(--ok)" : "var(--bad)") + "'><b>✓ " + pass + " / " + list.length + " passed</b> (ran at " + timeStr + ")</div>";
    list.forEach(function(r){
      h += "<div class='item' style='padding:6px 10px;margin-bottom:6px'><div class='tx'><span class='dot " + (r.pass ? "v" : "bad") + "'></span><b>" + r.name + "</b></div></div>";
    });
    return h;
  }

  function renderInventoryPanel(){
    var s = window.PRUI.getState(), total = 0, totalSpicy = 0, totalVer = 0;
    var rows = E.ALL_SLOTS.map(function(slot){
      var arr = s.lists[slot] || [], sp = arr.filter(function(it){ return it.x; }).length, vr = arr.filter(function(it){ return it.v; }).length;
      total += arr.length; totalSpicy += sp; totalVer += vr;
      return "<div class='item' style='align-items:center;padding:6px 10px;margin-bottom:6px'>" +
        "<div style='flex:1'><b>" + (SLOT_NAMES[slot]||slot) + "</b> <span style='color:var(--dim);font-size:11.5px'>(" + slot + ")</span></div>" +
        "<div style='font-size:12px;color:var(--dim);margin-right:8px'><span style='color:var(--txt);font-weight:700'>" + arr.length + "</span> · <span style='color:var(--ok)'>" + vr + "★</span> · <span style='color:var(--bad)'>" + sp + "🔥</span></div>" +
        "<button class='btn sm' data-jump='" + slot + "' style='padding:4px 8px;font-size:11.5px'>Edit</button></div>";
    }).join("");
    return "<div class='hint' style='margin-bottom:8px'><b>Total: " + total + " items</b> (" + totalVer + " verified · " + totalSpicy + " spicy · " + (s.presets||[]).length + " presets)</div>" + rows;
  }

  window.PRAsk = {
    SLOT_NAMES: SLOT_NAMES, slotOptionsHTML: slotOptionsHTML, buildAskRequest: buildAskRequest,
    renderExchangePanel: renderExchangePanel,
    renderBackupPanel: renderBackupPanel, renderTestPanel: renderTestPanel,
    renderInventoryPanel: renderInventoryPanel
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["ask"] = true;
})();
// EOF-ask.js