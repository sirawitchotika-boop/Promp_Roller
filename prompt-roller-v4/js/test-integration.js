// js/test-integration.js - Phase 5 regression checks.
(function(){
  var previousRun = window.PRTest.run;
  window.PRTest.run = function(){
    var results = previousRun();
    function T(name, pass){ results.push({ name: name, pass: !!pass, note: "" }); }
    var scene = { name: "Studio scene", values: {
      camera: "Eye level", action: "reading", light: "warm light",
      venue: "at the studio", outfit: "blue shirt" }};
    var old = { camera: "Low angle", action: "walking", light: "sunlight",
      venue: "at the park", outfit: "red dress" };
    var blocked = PRRoll.rollScene({}, "sfw", { outfit: true }, old, "any", [scene]);
    T("integration: locked outfit blocks mismatched preset", !blocked.matched);
    var matching = PRRoll.rollScene({}, "sfw", { outfit: true },
      Object.assign({}, old, { outfit: "blue shirt" }), "any", [scene]);
    T("integration: matching outfit lock allows preset",
      matching.matched && matching.outfit === "blue shirt" &&
      matching.vals.venue === "at the studio");
    var legacyScene = { name: "Legacy", values: {
      camera: "Eye level", action: "reading", light: "warm light",
      venue: "at the studio" }};
    var legacy = PRRoll.rollScene({}, "sfw", { outfit: true }, old, "any", [legacyScene]);
    T("integration: outfitless legacy presets remain usable",
      legacy.matched && legacy.outfit === "");
    var venueLock = PRRoll.rollScene({}, "sfw",
      { outfit: true, venue: true },
      Object.assign({}, old, { outfit: "blue shirt" }), "any", [scene]);
    T("integration: outfit and venue locks are both checked",
      !venueLock.matched && venueLock.vals.venue === "at the park");
    var free = PRRoll.rollScene({}, "sfw", {}, old, "any", [scene]);
    T("integration: unlocked full roll can use matching outfit",
      free.matched && free.outfit === "blue shirt");
    var solo = PRRoll.rollOneSlot("camera", old,
      { camera: [{t:"Eye level"}] }, "sfw", "any");
    T("integration: single dice still keeps outfit and venue",
      solo && solo.camera === "Eye level" &&
      solo.outfit === "red dress" && solo.venue === "at the park");
    // Mode/mood checks also apply when an Outfit comes from a prior scene.
    var sceneVals = { camera: "Eye level", action: "walking",
      light: "warm lamp", venue: "in a cafe" };
    var outfitLists = { outfit: [
      { t: "clean jacket" }, { t: "spicy dress", x: 1 },
      { t: "cold coat", m: "cold" }, { t: "tease coat", m: "tease" }
    ] };
    T("outfit reuse: SFW rejects previously spicy clothing",
      !PRUI.canUseOutfit("spicy dress", sceneVals, outfitLists, [], "sfw", "any"));
    T("outfit reuse: mood rejects differently tagged clothing",
      !PRUI.canUseOutfit("cold coat", sceneVals, outfitLists, [], "mix", "tease"));
    T("outfit reuse: matching tagged and untagged items are allowed",
      PRUI.canUseOutfit("tease coat", sceneVals, outfitLists, [], "sfw", "tease") &&
      PRUI.canUseOutfit("clean jacket", sceneVals, outfitLists, [], "sfw", "tease"));
    T("outfit reuse: unknown legacy clothing remains compatible",
      PRUI.canUseOutfit("saved custom outfit", sceneVals, outfitLists, [], "sfw", "any"));
    var spicyScene = [{ name: "Spicy scene", x: 1,
      values: Object.assign({}, sceneVals, { outfit: "preset-only outfit" }) }];
    T("outfit reuse: SFW rejects clothing linked to a spicy scene",
      !PRUI.canUseOutfit("preset-only outfit", sceneVals, outfitLists,
        spicyScene, "sfw", "any") &&
      PRUI.canUseOutfit("preset-only outfit", sceneVals, outfitLists,
        spicyScene, "mix", "any"));
    // UI-0 guards run on disposable values and leave the live editor untouched.
    var choose = PRRender.shouldReplaceDraft;
    T("UI-0: unrelated render keeps manually edited draft", !choose("generated", "my draft", false));
    T("UI-0: unchanged prompt updates automatically", choose("generated", "generated", false));
    T("UI-0: explicit rebuild may replace an edited draft", choose("generated", "my draft", true));
    var sceneValues = { camera: "front", action: "walking", light: "soft",
      venue: "garden" }, existing = [{ name: "Garden", values: sceneValues }];
    T("UI-0: complete unique scene may be saved",
      PRApp.validatePreset("Studio", sceneValues, existing) === "");
    T("UI-0: duplicate scene names are refused regardless of case",
      !!PRApp.validatePreset(" garden ", sceneValues, existing));
    T("UI-0: incomplete scenes cannot be saved",
      !!PRApp.validatePreset("Studio", { camera: "front", action: "",
        light: "soft", venue: "garden" }, existing));
    var originalConfirm = window.confirm, asked = "";
    window.confirm = function(msg){ asked = msg; return false; };
    T("UI-0: deletion cancellation is available",
      !PREdit.confirmDelete("test item") && asked.indexOf("cannot be undone") >= 0);
    window.confirm = originalConfirm;
    var get = PRUI.getState, save = PRUI.saveStore, hook = PR_RULES.HOOK,
      tail = PR_RULES.TAIL, saves = 0, partial = { hook: "My special hook" };
    try {
      PRUI.getState = function(){ return partial; };
      PRUI.saveStore = function(){ saves++; };
      PRHookTail.seed();
      T("UI-0: missing Tail keeps existing custom Hook",
        partial.hook === "My special hook" &&
        partial.tail === PR_RULES.__DEF_TAIL && saves === 1);
      partial = { tail: "My special tail" }; saves = 0;
      PRHookTail.seed();
      T("UI-0: missing Hook keeps existing custom Tail",
        partial.tail === "My special tail" &&
        partial.hook === PR_RULES.__DEF_HOOK && saves === 1);
    } finally {
      PRUI.getState = get; PRUI.saveStore = save;
      PR_RULES.HOOK = hook; PR_RULES.TAIL = tail;
    }
    T("UI-1: all active vocabulary slots have a navigation route",
      PREngine.ALL_SLOTS.every(function(slot){ return PREdit.panelFor(slot) === "vocabulary"; }));
    T("UI-1: Scenes and Exchange keep distinct routes",
      PREdit.panelFor("__scenes") === "scenes" &&
      PREdit.panelFor("__exchange") === "exchange");
    T("UI-1: inventory, Hook/Tail, backup and self-test remain accessible",
      ["__overview","__hooktail","__backup","__test"].every(function(v){
        return PREdit.panelFor(v) === "tools";
      }));
    T("UI-1: unexpected navigation targets cannot change panels",
      PREdit.panelFor("unknown") === null);
    var namedScene = { name: "Garden", values: {
      camera: "eye level", action: "walking", light: "daylight", venue: "garden"
    }};
    T("UI-2: matching scene shows its preset name",
      PRRender.sceneName([namedScene], namedScene.values) === "Garden");
    T("UI-2: partial or changed scene is described as custom",
      PRRender.sceneName([namedScene], { camera: "eye level", action: "running",
        light: "daylight", venue: "garden" }) === "");
    T("UI-2: legacy and incomplete preset entries do not crash scene status",
      PRRender.sceneName([null, {}, { name: "Old", values: { venue: "garden" } }],
        namedScene.values) === "");
    var sampleReport = PRAsk.renderTestPanel([
      { pass: true, name: "healthy case" }, { pass: false, name: "broken case", note: "check action" }
    ]);
    T("UI-3: self-test shows compact pass and fail totals",
      sampleReport.indexOf("1 / 2 passed") >= 0 && sampleReport.indexOf("1 failed") >= 0);
    T("UI-3: failures are visible before optional full details",
      sampleReport.indexOf("broken case") < sampleReport.indexOf("<details"));
    T("UI-3: full self-test report stays collapsed by default",
      sampleReport.indexOf("<details class='test-details'>") >= 0 &&
      sampleReport.indexOf("<details open") < 0);
    T("UI-3: test result labels are escaped before HTML display",
      PRAsk.renderTestPanel([{ pass: false, name: "<bad>" }]).indexOf("&lt;bad&gt;") >= 0);
    T("UI-4A: all active slots support the in-app editor",
      PREngine.ALL_SLOTS.every(function(k){ return PRSlotEditor.canOpen(k); }));
    T("UI-4A: unknown and archived slots are not editable",
      !PRSlotEditor.canOpen("missing") && !PRSlotEditor.canOpen("hands"));
    T("UI-4B: only the app's own history entry counts as a guard",
      PRNavigation.isGuard({ prRollerGuard: true }) &&
      !PRNavigation.isGuard({}) && !PRNavigation.isGuard(null));
    T("UI-4C: a matching draft can be recovered",
      PRDraft.decode(JSON.stringify({ base: "seed", text: "edited" }), "seed") === "edited");
    T("UI-4C: a draft from a different generated prompt is ignored",
      PRDraft.decode(JSON.stringify({ base: "old", text: "edited" }), "new") === null);
    T("UI-4C: damaged draft storage is ignored",
      PRDraft.decode("{damaged", "seed") === null);
    T("UI-4C: unchanged generated text is not an edited draft",
      PRDraft.decode(JSON.stringify({ base: "seed", text: "seed" }), "seed") === null);
    T("Save safety: legacy saves with missing optional fields are accepted",
      PRStorage.isValid({ lists: { eyes: [{ t: "blue eyes" }] } }));
    T("Save safety: invalid list structures are rejected",
      !PRStorage.isValid({ lists: { eyes: "not an array" } }));
    T("Save safety: unsafe keys are rejected",
      !PRStorage.isValid(JSON.parse('{"lists":{"__proto__":[{"t":"x"}]}}')));
    var badPreset = PRImport.parse('#preset: {"name":"Bad","values":"oops"}',
      null, { body: [] }, []);
    T("Save safety: invalid imported JSON presets are rejected",
      badPreset.presetsAdded === 0 && badPreset.bad === 1);
    var validPreset = PRImport.parse('#preset: {"name":"Okay","values":{"camera":"a","action":"b","light":"c","venue":"d"}}',
      null, { body: [] }, []);
    T("Save safety: valid JSON scene imports still work",
      validPreset.presetsAdded === 1 && validPreset.bad === 0);
    var blankPreset = PRImport.parse('#preset: !', null, { body: [] }, []);
    T("Save safety: empty imported scene names are rejected",
      blankPreset.presetsAdded === 0 && blankPreset.bad === 1);
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-integration"] = true;
})();
// EOF-test-integration.js
