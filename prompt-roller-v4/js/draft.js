// js/draft.js - session-only hand-edited Prompt Output recovery.
(function(){
  var KEY = "prompt_roller_v4_draft", ready = false;
  function decode(raw, base){
    try {
      var value = JSON.parse(raw);
      if(value && value.base === base && typeof value.text === "string" &&
         value.text !== base) return value.text;
    } catch(e){}
    return null;
  }
  function clear(){
    try { sessionStorage.removeItem(KEY); } catch(e){}
  }
  function track(text, base){
    // The first render happens before custom Hook/Tail values are seeded.
    // Do not overwrite an existing draft until the complete app is ready.
    if(!ready) return;
    if(text === base){ clear(); return; }
    try { sessionStorage.setItem(KEY, JSON.stringify({ base: base, text: text })); }
    catch(e){} // Browsers may disable session storage.
  }
  function recover(){
    if(ready) return false;
    var out = document.getElementById("out");
    if(!out){ ready = true; return false; }
    var base = PREngine.buildPrompt(PRUI.getState().current), raw = null;
    try { raw = sessionStorage.getItem(KEY); } catch(e){}
    var text = decode(raw, base);
    ready = true;
    if(text !== null){
      out.value = text;
      PRRender.onOutEdit();
      return true;
    }
    clear(); // A changed baseline cannot safely restore an older draft.
    return false;
  }
  window.PRDraft = { recover: recover, track: track, clear: clear, decode: decode };
  window.__EOF = window.__EOF || {};
  window.__EOF["draft"] = true;
})();
// EOF-draft.js
