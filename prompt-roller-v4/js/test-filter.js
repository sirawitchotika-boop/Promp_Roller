// js/test-filter.js - Phase 3: SFW and mood must never be bypassed.
(function(){
  var previousRun = window.PRTest.run;
  window.PRTest.run = function(){
    var results = previousRun();
    function T(name, pass){ results.push({ name: name, pass: !!pass, note: "" }); }
    var clean = { t: "clean" }, spicy = { t: "spicy", x: 1 };
    T("filter: SFW with only spicy items returns nothing",
      PRRoll.filterPool([spicy], "sfw", "any").length === 0);
    T("filter: SFW with mixed items never picks spicy",
      PRRoll.filterPool([clean, spicy], "sfw", "any")[0] === clean &&
      PRRoll.filterPool([clean, spicy], "sfw", "any").length === 1);
    T("filter: NSFW retains clean fallback for compatibility",
      PRRoll.filterPool([clean], "nsfw", "any")[0] === clean);
    var cold = { t: "cold", m: "cold" }, tease = { t: "tease", m: "tease" };
    T("filter: mismatched mood produces no items",
      PRRoll.filterPool([cold], "mix", "tease").length === 0);
    var eligible = PRRoll.filterPool([cold, tease, clean], "mix", "tease");
    T("filter: matching and untagged mood items stay available",
      eligible.length === 2 && eligible.indexOf(cold) < 0);
    var cleanTease = { t: "clean tease", m: "tease" };
    var spicyTease = { t: "spicy tease", x: 1, m: "tease" };
    var combo = PRRoll.filterPool([cold, cleanTease, spicyTease],
      "sfw", "tease");
    T("filter: SFW plus mood keeps only matching clean items",
      combo.length === 1 && combo[0] === cleanTease);
    T("filter: one-slot roll leaves values alone when nothing matches",
      PRRoll.rollOneSlot("outfit", { outfit: "old" },
        { outfit: [spicy] }, "sfw", "any") === null);
    T("filter: guarded reroll does not ignore empty mood pool",
      PRRoll.pickGuarded([cold], "mix", {}, "tease") === null);
    var preset = { name: "Cold Scene", m: "cold", values: {
      camera: "Eye level", action: "waiting", light: "sunlight", venue: "park" }};
    T("filter: scene rolling cannot use a mismatched mood",
      !PRRoll.rollScene({}, "sfw", {}, {}, "tease", [preset]).matched);
    T("filter: NSFW fallback still respects the selected mood",
      PRRoll.filterPool([{ t: "cold clean", m: "cold" }], "nsfw", "tease").length === 0);
    return results;
  };
  window.__EOF = window.__EOF || {};
  window.__EOF["test-filter"] = true;
})();
// EOF-test-filter.js
