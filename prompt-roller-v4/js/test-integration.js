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
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-integration"] = true;
})();
// EOF-test-integration.js
