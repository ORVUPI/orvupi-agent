(function () {
  var LANG_KEY = "orvupi-lab-lang";
  document.documentElement.classList.add("js");

  function readLang() {
    try {
      return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
    } catch (error) {
      return "es";
    }
  }

  function apply(lang) {
    document.documentElement.lang = lang === "en" ? "en" : "es";
    document.documentElement.setAttribute("data-lang", lang === "en" ? "en" : "es");
    document.querySelectorAll("[data-set-lang]").forEach(function (button) {
      var on = button.getAttribute("data-set-lang") === lang;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  apply(readLang());

  function connectivity() {
    var note = document.getElementById("aviso-red");
    if (!note) return;
    note.hidden = navigator.onLine !== false;
  }

  function onLab() {
    var path = location.pathname;
    return /\/lab\/(?:index\.html)?$/.test(path);
  }

  function register() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    if (!onLab()) return;
    navigator.serviceWorker.register("/lab/sw.js", { scope: "/lab/" }).then(function (registration) {
      registration.addEventListener("updatefound", function () {
        var worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            var update = document.getElementById("aviso-version");
            if (update) update.hidden = false;
          }
        });
      });
    }).catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(readLang());
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
    var reload = document.getElementById("recargar");
    if (reload) {
      reload.addEventListener("click", function () {
        location.reload();
      });
    }
    window.addEventListener("offline", connectivity);
    window.addEventListener("online", connectivity);
    connectivity();
    register();
  });
})();
