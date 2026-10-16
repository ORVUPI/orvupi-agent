/* ORVUPI web v2. Mismo origen. Sin service worker y sin red. */
(function () {
  var LANG_KEY = "stubx-lab-lang";
  // Contrato ORVUPI: aún no existe (ver /shared/orvupi-contract.json). Sin contrato no hay nada que copiar.
  var OFFICIAL_CA = "";
  document.documentElement.classList.add("js");

  function readLang() {
    try {
      return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
    } catch (error) {
      return "es";
    }
  }

  function apply(lang) {
    var next = lang === "en" ? "en" : "es";
    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-lang", next);
    var title = document.querySelector("title");
    if (title) {
      var translated = title.getAttribute(next === "en" ? "data-title-en" : "data-title-es");
      if (translated) title.textContent = translated;
    }
    document.querySelectorAll("[data-set-lang]").forEach(function (button) {
      var on = button.getAttribute("data-set-lang") === next;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  apply(readLang());

  function focusHash() {
    var hash = location.hash;
    if (!hash || hash.length < 2) return;
    var id = "";
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch (error) {
      return;
    }
    var target = document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(readLang());
    focusHash();
    window.addEventListener("hashchange", focusHash);
    document.querySelectorAll("[data-set-lang]").forEach(function (button) {
      button.addEventListener("click", function () {
        var lang = button.getAttribute("data-set-lang") === "en" ? "en" : "es";
        try {
          localStorage.setItem(LANG_KEY, lang);
        } catch (error) {
          /* El idioma sigue en la página aunque el navegador no lo guarde. */
        }
        apply(lang);
        document.dispatchEvent(new CustomEvent("stubx-lang", { detail: lang }));
      });
    });

    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      var label = btn.querySelector("[data-copy-label]");
      var status = btn.parentElement && btn.parentElement.querySelector("[data-copy-status]");
      var original = label ? label.textContent : btn.textContent;
      var timer;
      var say = function (msg, state) {
        if (label) label.textContent = msg;
        else btn.textContent = msg;
        if (status) status.textContent = msg;
        if (state) btn.setAttribute("data-state", state);
        else btn.removeAttribute("data-state");
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (label) label.textContent = original;
          else btn.textContent = original;
          btn.removeAttribute("data-state");
          if (status) status.textContent = "";
        }, 2500);
      };
      btn.addEventListener("click", function () {
        var value = (btn.getAttribute("data-copy") || "").trim();
        if (!OFFICIAL_CA || value !== OFFICIAL_CA) {
          say(value ? "Copia bloqueada" : "Vacío", "error");
          return;
        }
        var done = function () {
          say(document.documentElement.lang === "en" ? "Copied" : "Copiada", "ok");
        };
        var fail = function () {
          say(document.documentElement.lang === "en" ? "Could not copy" : "No se pudo copiar", "error");
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(OFFICIAL_CA).then(done).catch(fail);
        } else {
          fail();
        }
      });
    });

    var menu = document.querySelector("details.mapa");
    if (menu) {
      menu.addEventListener("click", function (event) {
        if (event.target.closest("a")) menu.removeAttribute("open");
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && menu.hasAttribute("open")) {
          menu.removeAttribute("open");
          var summary = menu.querySelector("summary");
          if (summary) summary.focus();
        }
      });
    }

    var caida = document.getElementById("ver-lectura-caida");
    if (caida) {
      caida.addEventListener("click", function () {
        var input = document.getElementById("direccion-token");
        var raw = input && input.value ? input.value : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        document.dispatchEvent(
          new CustomEvent("stubx-verify-preview", {
            detail: { kind: "lectura_caida", raw: raw },
          }),
        );
        var resultado = document.getElementById("resultado");
        if (resultado) resultado.focus();
      });
    }

    var path = location.pathname;
    var onLab = /\/lab\/(?:index\.html)?$/.test(path) || /\/lab$/.test(path);
    if (onLab && "serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("/lab/sw.js", { scope: "/lab/" }).catch(function () {});
    }
  });
})();
