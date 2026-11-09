// js/test-backup.js - Phase 4: legacy exchange and safe backup restore.
(function(){
  var previousRun = window.PRTest.run;
  window.PRTest.run = function(){
    var results = previousRun(), E = window.PREngine, B = window.PRBackup;
    function T(name, pass){ results.push({ name: name, pass: !!pass, note: "" }); }
    var source = { outfit: [{ t: "blue jacket" }],
      hands: [{ t: "one hand raised", m: "shy" }],
      prop: [{ t: "a travel bag", n: "saved item" }],
      depth: [{ t: "city skyline", g: { in: "outdoor" } }] };
    var text = E.exportText(source);
    T("exchange: exported text includes all three legacy lists",
      ["hands", "prop", "depth"].every(function(k){
        return text.indexOf("#list: " + k) >= 0;
      }));
    var imported = E.parseImport(text);
    T("exchange: archived list values survive text round-trip",
      imported.added === 4 && imported.itemsByList.hands[0].t === "one hand raised" &&
      imported.itemsByList.prop[0].t === "a travel bag" &&
      imported.itemsByList.depth[0].t === "city skyline");
    T("exchange: archived mood, notes and guards survive",
      imported.itemsByList.hands[0].m === "shy" &&
      imported.itemsByList.prop[0].n === "saved item" &&
      imported.itemsByList.depth[0].g.in === "outdoor");
    T("exchange: legacy slots stay outside active roller",
      ["hands", "prop", "depth"].every(function(k){ return E.ALL_SLOTS.indexOf(k) < 0; }));
    var legacy = { lists: source, current: { outfit: "blue jacket" },
      locked: { outfit: true }, custom: { outfit: false },
      presets: [{ name: "Old scene", values: { venue: "at a station" } }],
      spicy: false };
    var state = { hook: "old hook", tail: "old tail", lists: {} };
    var result = B.restore(legacy, state);
    T("backup: older backup restores lists, locks and presets",
      result.ok && state.lists.depth[0].t === "city skyline" &&
      state.locked.outfit && state.presets[0].values.venue === "at a station");
    T("backup: old spicy mode is still understood",
      state.mode === "sfw" && state.mood === "any");
    T("backup: absent old hook and tail are cleared for default reseeding",
      !Object.prototype.hasOwnProperty.call(state, "hook") &&
      !Object.prototype.hasOwnProperty.call(state, "tail"));
    var stable = JSON.stringify(state);
    T("backup: invalid JSON shape cannot replace saved data",
      !B.restore([], state).ok && JSON.stringify(state) === stable);
    T("backup: missing lists cannot replace saved data",
      !B.restore({ current: {} }, state).ok && JSON.stringify(state) === stable);
    T("backup: malformed list items cannot replace saved data",
      !B.restore({ lists: { outfit: [null] } }, state).ok &&
      JSON.stringify(state) === stable);
    T("backup: wrong slot value types cannot replace saved data",
      !B.restore({ lists: source, current: { outfit: 42 } }, state).ok &&
      JSON.stringify(state) === stable);
    T("backup: invalid presets cannot replace saved data",
      !B.restore({ lists: source, presets: [{}] }, state).ok &&
      JSON.stringify(state) === stable);
    var unsafe = JSON.parse('{"lists":{"outfit":[]},"__proto__":{}}');
    T("backup: unsafe object keys are rejected",
      !B.restore(unsafe, state).ok && JSON.stringify(state) === stable);
    var full = { lists: source, current: { outfit: "blue jacket" },
      locked: {}, custom: {}, presets: [], mode: "sfw", mood: "tease",
      hook: "custom hook", tail: "custom tail" };
    var fresh = {};
    T("backup: new backup restores custom hook and tail",
      B.restore(JSON.parse(JSON.stringify(full)), fresh).ok &&
      fresh.hook === "custom hook" && fresh.tail === "custom tail" &&
      fresh.lists.hands[0].m === "shy");
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-backup"] = true;
})();
// EOF-test-backup.js
