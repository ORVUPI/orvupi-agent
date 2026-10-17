/* ORVUPI web v2. Mismo origen. Sin service worker y sin red. */
(function () {
  var LANG_KEY = "orvupi-lab-lang";
  // Claves guardadas antes del 16-10-2026 con el nombre anterior. Se copian a orvupi-* sin borrar
  // las antiguas: así una vuelta atrás a la versión anterior sigue viendo sus datos (ver shared/ROLLBACK.md).
  // Las antiguas se retirarán dentro de dos versiones. Solo se copian claves conocidas con un valor válido,
  // y si ya hay una clave nueva, manda la nueva. Corre una vez por navegador (marca MIGRATION_MARK).
  var LEGACY_KEY_PREFIX = "stubx-";
  var MIGRATION_MARK = "orvupi-migracion-claves";
  var MAX_VALUE = 2000000;
  function isJsonObject(value) {
    try {
      var parsed = JSON.parse(value);
      return Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed);
    } catch (error) {
      return false;
    }
  }
  function legacyValueOk(suffix, value) {
    if (typeof value !== "string" || value.length > MAX_VALUE) return false;
    if (suffix === "lab-lang") return value === "es" || value === "en";
    if (suffix === "studio-draft") return isJsonObject(value);
    if (/^lab-[a-z0-9][a-z0-9-]{0,63}$/.test(suffix)) return isJsonObject(value);
    return false;
  }
  function migrateLegacyKeys(storage) {
    try {
      if (storage.getItem(MIGRATION_MARK) !== null) return;
      var old = [];
      for (var i = 0; i < storage.length; i += 1) {
        var key = storage.key(i);
        if (key && key.indexOf(LEGACY_KEY_PREFIX) === 0) old.push(key);
      }
      old.forEach(function (key) {
        var suffix = key.slice(LEGACY_KEY_PREFIX.length);
        var value = storage.getItem(key);
        if (!legacyValueOk(suffix, value)) return;
        var next = "orvupi-" + suffix;
        if (storage.getItem(next) === null) storage.setItem(next, value);
      });
      storage.setItem(MIGRATION_MARK, "2026-10-16");
    } catch (error) {
      /* Sin almacenamiento o lleno: las claves antiguas se quedan como estaban. */
    }
  }
  try { migrateLegacyKeys(window.localStorage); } catch (error) { /* sin localStorage */ }
  // Contrato ORVUPI: Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU (ver /shared/orvupi-contract.json). Sin contrato no hay nada que copiar.
  // La dirección se lee al copiar de /shared/orvupi-contract.js, el único módulo del contrato.
  document.documentElement.classList.add("js");

  function readLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === null) {
        // Idioma guardado con la clave anterior al cambio de nombre: se migra una vez.
        var legacy = localStorage.getItem(LEGACY_KEY_PREFIX + "lang");
        if (legacy === "en" || legacy === "es") {
          localStorage.setItem(LANG_KEY, legacy);
          localStorage.removeItem(LEGACY_KEY_PREFIX + "lang");
          saved = legacy;
        }
      }
      return saved === "en" ? "en" : "es";
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
        document.dispatchEvent(new CustomEvent("orvupi-lang", { detail: lang }));
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
        var done = function () {
          say(document.documentElement.lang === "en" ? "Copied" : "Copiada", "ok");
        };
        var fail = function () {
          say(document.documentElement.lang === "en" ? "Could not copy" : "No se pudo copiar", "error");
        };
        import("/shared/orvupi-contract.js").then(function (contract) {
          if (!contract.isOfficialAddress(value)) {
            say(value ? "Copia bloqueada" : "Vacío", "error");
            return;
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(contract.OFFICIAL_ADDRESS).then(done).catch(fail);
          } else {
            fail();
          }
        }).catch(function () {
          say("Copia bloqueada", "error");
        });
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
          new CustomEvent("orvupi-verify-preview", {
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
