// js/test-preset.js - Focused Phase 2 regression checks (wraps existing self-tests).
(function(){
  var previousRun = window.PRTest.run;
  window.PRTest.run = function(){
    var results = previousRun();
    function T(name, pass){ results.push({ name: name, pass: !!pass, note: "" }); }
    var scene = { name: "Example", values: {
      camera: "Eye level", action: "reading a book",
      light: "warm lamp", venue: "in a cafe", outfit: "blue jacket"
    }};
    var before = { camera: "Low angle", action: "walking",
      light: "daylight", venue: "at the beach",
      outfit: "red dress", hairC: "black" };
    var snapshot = JSON.stringify(before);
    var result = PRRoll.applyScenePreset(scene, before, {});
    T("apply: complete preset replaces four scene slots and outfit",
      result.applied && result.current.camera === "Eye level" &&
      result.current.action === "reading a book" &&
      result.current.light === "warm lamp" &&
      result.current.venue === "in a cafe" &&
      result.current.outfit === "blue jacket" &&
      result.current.hairC === "black");
    T("apply: original values are not changed", JSON.stringify(before) === snapshot);
    var locked = PRRoll.applyScenePreset(scene, before, { camera: true });
    T("apply: conflicting scene lock cancels the whole apply",
      !locked.applied && !locked.current && JSON.stringify(before) === snapshot);
    var equal = Object.assign({}, before, { camera: "Eye level" });
    var matching = PRRoll.applyScenePreset(scene, equal, { camera: true });
    T("apply: matching locked scene value permits preset",
      matching.applied && matching.current.camera === "Eye level" &&
      matching.current.venue === "in a cafe");
    var lockedOutfit = PRRoll.applyScenePreset(scene, before, { outfit: true });
    T("apply: conflicting outfit lock cancels the whole apply",
      !lockedOutfit.applied && JSON.stringify(before) === snapshot);
    var partial = PRRoll.applyScenePreset({ name: "Partial",
      values: { venue: "in a cafe" } }, before, {});
    T("apply: incomplete preset is refused", !partial.applied);
    var oldPreset = { name: "Custom", values: {
      camera: "Eye level", action: "reading a book",
      light: "warm lamp", venue: "in a cafe" }};
    var legacy = PRRoll.applyScenePreset(oldPreset, before, {});
    T("apply: old preset without outfit preserves clothing",
      legacy.applied && legacy.current.outfit === "red dress");
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-preset"] = true;
})();
// EOF-test-preset.js
