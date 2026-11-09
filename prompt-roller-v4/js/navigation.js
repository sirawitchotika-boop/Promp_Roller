// js/navigation.js - single Back guard for the mobile website.
(function(){
  var leaving = false, armed = false;
  function isGuard(state){ return !!state && state.prRollerGuard === true; }
  function arm(){
    if(!window.history || !history.pushState) return;
    try {
      if(!isGuard(history.state)) history.pushState({ prRollerGuard: true }, "", location.href);
      armed = true;
    } catch(e){ armed = false; }
  }
  function onBack(){
    if(!armed || leaving) return;
    // Replace the consumed guard entry before showing an in-app choice.
    try { history.pushState({ prRollerGuard: true }, "", location.href); }
    catch(e){ armed = false; return; }
    if(window.PRSlotEditor && PRSlotEditor.isOpen()){
      PRSlotEditor.close(); return;
    }
    var edit = document.getElementById("view-edit");
    if(edit && !edit.hidden){
      if(window.showTab) window.showTab("roll");
      return;
    }
    var dialog = document.getElementById("exitDialog");
    if(dialog && dialog.showModal && !dialog.open) dialog.showModal();
  }
  function init(){
    var d = document.getElementById("exitDialog");
    if(!d) return;
    document.getElementById("exitStay").addEventListener("click", function(){ d.close(); });
    document.getElementById("exitLeave").addEventListener("click", function(){
      leaving = true; d.close();
      // From the guard entry, go past the original page entry.
      // With no earlier page, browsers may simply remain on this page.
      if(window.history && history.go) history.go(-2);
    });
    window.addEventListener("popstate", onBack);
    arm();
  }
  window.PRNavigation = { init: init, isGuard: isGuard, onBack: onBack };
  window.__EOF = window.__EOF || {};
  window.__EOF["navigation"] = true;
})();
// EOF-navigation.js
