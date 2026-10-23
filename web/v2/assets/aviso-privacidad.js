// Aviso de privacidad de Verify: se puede cerrar con la X y se recuerda en este navegador.
// El enlace «Privacidad» lo vuelve a abrir. No envía nada a ningún servidor.
(function () {
  "use strict";
  var KEY = "orvupi.verify.avisoPrivacidad.cerrado";
  function read() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function write(v) { try { if (v) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch (e) {} }
  function apply(closed) {
    document.querySelectorAll(".aviso-fijo.privacidad").forEach(function (n) { n.hidden = closed; });
    document.querySelectorAll(".privacidad-abrir").forEach(function (n) { n.hidden = !closed; });
  }
  function labels() {
    var en = document.documentElement.getAttribute("data-lang") === "en";
    document.querySelectorAll(".aviso-cerrar").forEach(function (b) {
      b.setAttribute("aria-label", en ? "Close the privacy notice" : "Cerrar el aviso de privacidad");
    });
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    if (t.closest(".aviso-cerrar")) {
      ev.preventDefault(); write(true); apply(true);
      var open = document.querySelector(".privacidad-abrir .aviso-abrir");
      if (open) open.focus();
    } else if (t.closest(".aviso-abrir")) {
      ev.preventDefault(); write(false); apply(false);
      var close = document.querySelector("#aviso-guardar .aviso-cerrar");
      if (close) close.focus();
    }
  });
  function init() {
    labels(); apply(read());
    new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    var res = document.getElementById("resultado");
    if (res) new MutationObserver(function () { apply(read()); }).observe(res, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
