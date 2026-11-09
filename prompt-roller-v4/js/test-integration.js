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
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-integration"] = true;
})();
// EOF-test-integration.js
