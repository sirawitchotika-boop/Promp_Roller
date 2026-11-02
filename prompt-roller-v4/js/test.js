// js/test.js - In-App Self-Test Suite (Throwaway Mock Data)
(function(){
  var E = window.PREngine;
  var R = window.PR_RULES;

  function runTests(){
    var results = [];
    function T(name, pass, note){ results.push({ name: name, pass: !!pass, note: note || "" }); }

    // 1. Minors test
    T("minors: 'a teen girl' blocked", E.checkMinors("a teen girl") === "teen");
    T("minors: 'school' blocked", E.checkMinors("middle school area") !== null);
    T("minors: 'adult woman' allowed", E.checkMinors("young adult woman 22yo") === null);

    // 2. Banned words check
    var wBanned = E.validate({}, "A wide camera view with 85mm lens");
    T("banned: 'camera' flagged in warnings", wBanned.some(function(w){ return w.includes("camera"); }));

    // 3. Pairing R1 (wedgie + front camera warns; + rear camera silent)
    var r1Warn = E.validate({ outfit: "wedgie bottom", camera: "front view" });
    T("pairing R1: wedgie + front warns", r1Warn.some(function(w){ return w.includes("R1"); }));
    var r1Silent = E.validate({ outfit: "wedgie bottom", camera: "from behind her" });
    T("pairing R1: wedgie + behind silent", !r1Silent.some(function(w){ return w.includes("R1"); }));

    // 4. Pairing R3 (T3 camera + wrong action warns; + matching action silent)
    var r3Warn = E.validate({ camera: "kneels over the viewer", action: "dancing mid-spin" });
    T("pairing R3: T3 + dancing warns", r3Warn.some(function(w){ return w.includes("R3"); }));
    var r3Silent = E.validate({ camera: "kneels over the viewer", action: "straddle above the viewer" });
    T("pairing R3: T3 + straddle silent", !r3Silent.some(function(w){ return w.includes("R3"); }));

    // 5. Pairing R6 (T13 camera + kitchen warns; + pool venue silent)
    var r6Warn = E.validate({ camera: "inside the pool", venue: "in a night kitchen" });
    T("pairing R6: T13 + kitchen warns", r6Warn.some(function(w){ return w.includes("R6"); }));
    var r6Silent = E.validate({ camera: "inside the pool", venue: "at the pool edge" });
    T("pairing R6: T13 + pool venue silent", !r6Silent.some(function(w){ return w.includes("R6"); }));

    // 6. Pairing R10 (paint outfit + bikini warns)
    var r10Warn = E.validate({ outfit: "painted directly on her bare skin", venue: "beach with red bikini girl" });
    T("pairing R10: paint + bikini warns", r10Warn.some(function(w){ return w.includes("R10"); }));

    // 7. Prompt build order (camera first, hook, tail last)
    var pTest = E.buildPrompt({ camera: "Eye level view", body: "curvy fit body" });
    T("build order: camera first", pTest.startsWith("Eye level view, 2.5D semi-realistic"));
    T("build order: tail last", pTest.endsWith("No other people, no readable text."));

    // 8. hairText interpolation
    var h1 = E.hairText("long {c} hair", "golden blonde");
    T("hairText: {c} replaced", h1 === "long golden blonde hair");
    var h2 = E.hairText("a messy bun", "black");
    T("hairText: fallback to ', her X hair'", h2 === "a messy bun, her black hair");

    // 9. Spicy OFF filter
    var pool = [{ t: "SFW item" }, { t: "Spicy item", x: 1 }];
    var sfwPicked = true;
    for(var k = 0; k < 20; k++){
      if(E.pickSlot(pool, false) === "Spicy item") sfwPicked = false;
    }
    T("spicy OFF: pool contains no x-flagged items", sfwPicked);

    // 10. Import parser
    var sampleImp = "#list: hairS\n!*her {c} hair in a twist\n1. twin {c} braids\n// comment\na teen girl style\n";
    var impRes = E.parseImport(sampleImp);
    T("import: numbering stripped & markers parsed", impRes.itemsByList.hairS && impRes.itemsByList.hairS[0].x === 1);
    T("import: minors line blocked", impRes.blocked === 1);

    // 11. Export -> Import round trip
    var exp = E.exportText({ hairC: [{ t: "jet-black" }, { t: "pink dyed", x: 1, v: 1 }] });
    var reImp = E.parseImport(exp);
    T("export -> import round trip", reImp.added === 2 && reImp.itemsByList.hairC[1].x === 1);

    // 12. #preset: import extension
    var pImp = E.parseImport("#preset: !Night club\ncamera: Eye level view\nvenue: in a dark party room\n");
    T("import: #preset: extension parsed", pImp.presetsAdded === 1 && pImp.presets[0].x === 1 && pImp.presets[0].values.venue === "in a dark party room");

    return results;
  }

  window.PRTest = { run: runTests };
  window.__EOF = window.__EOF || {};
  window.__EOF["test"] = true;
})();
// EOF-test.js
