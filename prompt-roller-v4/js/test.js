// js/test.js - In-App Self-Test Suite (Throwaway Mock Data, v4.3)
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

    // 7. Prompt build order (camera first, live hook second, tail last)
    var pTest = E.buildPrompt({ camera: "Eye level view", body: "curvy fit body" });
    T("build order: camera first", pTest.startsWith("Eye level view, " + R.HOOK));
    T("build order: tail last", pTest.endsWith("No other people, no readable text."));

    // 8. hairText interpolation
    var h1 = E.hairText("long {c} hair", "golden blonde");
    T("hairText: {c} replaced", h1 === "long golden blonde hair");
    var h2 = E.hairText("a messy bun", "black");
    T("hairText: fallback to ', her X hair'", h2 === "a messy bun, her black hair");

    // 9. Spicy OFF filter (legacy boolean API still works)
    var pool = [{ t: "SFW item" }, { t: "Spicy item", x: 1 }];
    var sfwPicked = true;
    for(var k = 0; k < 20; k++){
      if(E.pickSlot(pool, false) === "Spicy item") sfwPicked = false;
    }
    T("spicy OFF: pool contains no x-flagged items", sfwPicked);

    // 9b. Roll modes (v4.2): sfw / nsfw / mix
    var mPool = [{ t: "clean item" }, { t: "hot item", x: 1 }];
    var nsfwOnly = true, sfwOnly = true;
    for(var m9 = 0; m9 < 20; m9++){
      if(E.pickSlot(mPool, "nsfw") !== "hot item") nsfwOnly = false;
      if(E.pickSlot(mPool, "sfw") !== "clean item") sfwOnly = false;
    }
    T("mode nsfw: only x-flagged items roll", nsfwOnly);
    T("mode sfw: only clean items roll", sfwOnly);
    T("mode nsfw: empty spicy pool falls back to clean", E.pickSlot([{ t: "clean item" }], "nsfw") === "clean item");
    var mixPick = PRRoll.pickGuarded(mPool, "mix", {});
    T("mode mix: guarded roll draws from the full pool", !!mixPick && (mixPick.t === "clean item" || mixPick.t === "hot item"));

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

    // 13. Guard tags (v4.1)
    var gParsed = PRRoll.parseGuard("her text [G: face=rear, in=indoor]");
    T("guard: tag parsed & stripped from text", !!(gParsed && gParsed.g.face === "rear" && gParsed.g.in === "indoor" && gParsed.text === "her text"));
    var gPool = [{ t: "indoor item", g: { in: "indoor" } }, { t: "outdoor item", g: { in: "outdoor" } }];
    var gOk = true;
    for(var gi = 0; gi < 20; gi++){
      if(PRRoll.pickGuarded(gPool, true, { in: "indoor" }).t !== "indoor item") gOk = false;
    }
    T("guard: filter never returns a conflicting item", gOk);
    var gFall = [{ t: "mismatch", g: { in: "indoor" } }, { t: "free item" }];
    var gFallOk = true;
    for(var gj = 0; gj < 20; gj++){
      if(PRRoll.pickGuarded(gFall, true, { in: "outdoor" }).t !== "free item") gFallOk = false;
    }
    T("guard: untagged fallback when all tagged mismatch", gFallOk);
    var fence = "\u0060\u0060\u0060text\n#list: hairS\nher {c} hair in a twist\n\u0060\u0060\u0060\n";
    var fRes = E.parseImport(fence);
    T("import: codeblock fences skipped", fRes.added === 1 && fRes.bad === 0);
    var badG = E.parseImport("#list: outfit\nher red dress [G: front]\n");
    T("import: malformed guard bracket stripped", badG.added === 1 && badG.itemsByList.outfit[0].t === "her red dress" && !badG.itemsByList.outfit[0].g);

    // 14. Mood tags (v4.3)
    var mImp = E.parseImport("#list: face\nher sly wink [M: tease]\n");
    T("mood: tag parsed & stripped from text", mImp.added === 1 && mImp.itemsByList.face[0].m === "tease" && mImp.itemsByList.face[0].t === "her sly wink");
    var mExp = E.exportText({ face: [{ t: "her soft gaze", m: "devoted" }] });
    var mRe = E.parseImport(mExp);
    T("mood: export -> import round trip", mRe.added === 1 && mRe.itemsByList.face[0].m === "devoted");
    var moodPool = [{ t: "free item" }, { t: "tease item", m: "tease" }, { t: "cold item", m: "cold" }];
    var moodOk = true;
    for(var mi = 0; mi < 20; mi++){
      if(E.pickSlot(moodPool, "mix", "tease") === "cold item") moodOk = false;
    }
    T("mood: filter never returns a mismatched mood", moodOk);
    T("mood: untagged items still roll under a mood", E.pickSlot([{ t: "free item" }], "mix", "tease") === "free item");
    T("mood: all-mismatch pool falls back (never dead)", E.pickSlot([{ t: "cold item", m: "cold" }], "mix", "tease") === "cold item");
    var comboImp = E.parseImport("#list: action\nher move [NOTE: keep] [G: in=indoor] [M: shy]\n");
    T("mood: NOTE + G + M on one line all parsed", comboImp.added === 1 && comboImp.itemsByList.action[0].m === "shy" && comboImp.itemsByList.action[0].g.in === "indoor" && comboImp.itemsByList.action[0].n === "keep" && comboImp.itemsByList.action[0].t === "her move");

    // 15. Preset mood tags (v4.3 Phase C)
    var pmImp = E.parseImport("#preset: !Night club [M: tease]\ncamera: Eye level view\nvenue: in a dark party room\n");
    T("preset mood: [M:] on header parsed", pmImp.presetsAdded === 1 && pmImp.presets[0].m === "tease" && pmImp.presets[0].name === "Night club" && pmImp.presets[0].x === 1);
    var pmExp = E.exportText({}, null, [{ name: "Cold rooftop", values: { venue: "on a rooftop" }, m: "cold" }]);
    var pmRe = E.parseImport(pmExp);
    T("preset mood: export -> import round trip", pmRe.presetsAdded === 1 && pmRe.presets[0].m === "cold" && pmRe.presets[0].values.venue === "on a rooftop");

    return results;
  }

  window.PRTest = { run: runTests };
  window.__EOF = window.__EOF || {};
  window.__EOF["test"] = true;
})();
// EOF-test.js