// js/slot-editor.js - in-app editor for one active slot.
(function(){
  var onSave = null, previousFocus = null, previousScroll = null;
  function el(id){ return document.getElementById(id); }
  function canOpen(slot){
    return !!window.PREngine && PREngine.ALL_SLOTS.indexOf(slot) >= 0;
  }
  function isOpen(){ var d = el("slotEditDialog"); return !!d && d.open; }
  function close(){
    var d = el("slotEditDialog"), input = el("slotEditInput");
    if(input) input.blur(); // Dismiss Android keyboard before closing the dialog.
    if(document.activeElement && document.activeElement.blur)
      document.activeElement.blur();
    if(d && d.open) d.close();
    onSave = null;
    if(previousFocus && previousFocus.isConnected && previousFocus.focus)
      previousFocus.focus({ preventScroll: true });
    previousFocus = null;
    if(previousScroll !== null && window.scrollTo){
      var top = previousScroll;
      window.scrollTo(0, top);
      // Android may resize the viewport again when its keyboard closes.
      if(window.setTimeout) window.setTimeout(function(){ window.scrollTo(0, top); }, 180);
    }
    previousScroll = null;
  }
  function open(slot, value, save){
    var d = el("slotEditDialog"), input = el("slotEditInput");
    if(!d || !input || !d.showModal || !canOpen(slot) || isOpen()) return false;
    previousFocus = document.activeElement;
    previousScroll = typeof window.scrollY === "number" ? window.scrollY : null;
    var name = (window.PRAsk && PRAsk.SLOT_NAMES[slot]) || slot;
    el("slotEditTitle").textContent = "Edit " + name;
    input.value = String(value || "");
    el("slotEditError").hidden = true;
    onSave = save;
    d.showModal();
    input.focus();
    return true;
  }
  function save(){
    if(!isOpen() || !onSave) return false;
    var error = onSave(el("slotEditInput").value.trim());
    if(error){
      var box = el("slotEditError"); box.textContent = error; box.hidden = false;
      el("slotEditInput").focus();
      return false;
    }
    close();
    return true;
  }
  function init(){
    var d = el("slotEditDialog");
    if(!d) return;
    el("slotEditCancel").addEventListener("click", close);
    el("slotEditSave").addEventListener("click", save);
    d.addEventListener("cancel", function(e){ e.preventDefault(); close(); });
  }
  window.PRSlotEditor = { init: init, open: open, close: close,
    save: save, isOpen: isOpen, canOpen: canOpen };
  window.__EOF = window.__EOF || {};
  window.__EOF["slot-editor"] = true;
})();
// EOF-slot-editor.js
