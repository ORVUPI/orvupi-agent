/* Cabecera agrupada y saludo de la portada. No toca editores ni datos. */
(function () {
  var btn = document.getElementById("abrir-menu");
  var panel = document.getElementById("menu-movil");
  if (btn && panel) {
    var volver = null;
    function cerrarMenu() {
      if (panel.hidden) return;
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      var closed = btn.querySelector(".when-closed");
      var open = btn.querySelector(".when-open");
      if (closed) closed.hidden = false;
      if (open) open.hidden = true;
      if (volver) volver.focus();
    }
    btn.addEventListener("click", function () {
      if (panel.hidden) {
        volver = document.activeElement;
        panel.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        var closed = btn.querySelector(".when-closed");
        var open = btn.querySelector(".when-open");
        if (closed) closed.hidden = true;
        if (open) open.hidden = false;
        var primero = panel.querySelector("summary, a, button");
        if (primero) primero.focus();
      } else {
        cerrarMenu();
      }
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) cerrarMenu();
    });
    document.querySelectorAll("header.orv-bar .orv-nav details").forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        document.querySelectorAll("header.orv-bar details").forEach(function (o) {
          if (o !== d && !o.closest(".langpick")) o.removeAttribute("open");
        });
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!panel.hidden) { cerrarMenu(); return; }
      var abierto = document.querySelector("header.orv-bar .orv-nav details[open]");
      if (abierto) {
        abierto.removeAttribute("open");
        var s = abierto.querySelector("summary");
        if (s) s.focus();
      }
    });
  }

  var escena = document.getElementById("escena");
  var video = document.getElementById("saludo");
  if (!escena || !video) return;
  var estado = document.getElementById("estado-escena");
  var reproducir = document.getElementById("reproducir");
  var pausar = document.getElementById("pausar");
  var fija = document.getElementById("fija");
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var quiere = false;
  var pausaUsuario = false;
  var visible = true;
  var fallo = false;
  function decir(texto) { if (estado) estado.textContent = texto; }
  function cargar() {
    if (video.getAttribute("src")) return;
    video.src = video.getAttribute("data-src");
    video.load();
  }
  function puede() {
    return quiere && !pausaUsuario && visible && !document.hidden && !fallo;
  }
  function aplicar() {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    if (puede()) {
      cargar();
      video.autoplay = true;
      var intento = video.play();
      if (intento && intento.catch) {
        intento.catch(function (err) {
          if (!puede()) return;
          if (err && err.name === "AbortError") return;
          escena.classList.remove("is-playing");
          decir(document.documentElement.getAttribute("data-lang") === "en"
            ? "Still image. Press Play greeting to watch it."
            : "Imagen fija. Pulsa Reproducir saludo para verlo.");
          if (reproducir) reproducir.setAttribute("aria-pressed", "false");
        });
      }
      escena.classList.add("is-playing");
      decir(document.documentElement.getAttribute("data-lang") === "en"
        ? "Greeting playing, with no sound. You can pause it."
        : "Saludo en reproducción, sin sonido. Puedes pausarlo.");
      if (reproducir) reproducir.setAttribute("aria-pressed", "true");
    } else {
      video.pause();
      escena.classList.remove("is-playing");
      if (reproducir) reproducir.setAttribute("aria-pressed", "false");
      if (fallo) {
        decir(document.documentElement.getAttribute("data-lang") === "en"
          ? "Still image. The video could not be played."
          : "Imagen fija. El vídeo no se ha podido reproducir.");
      } else if (reducido && !quiere) {
        decir(document.documentElement.getAttribute("data-lang") === "en"
          ? "Still image. Reduced motion is on; you can play the greeting if you want."
          : "Imagen fija. El movimiento reducido está activo; puedes ver el saludo si quieres.");
      } else {
        decir(document.documentElement.getAttribute("data-lang") === "en"
          ? "Still image. The greeting is not playing."
          : "Imagen fija. El saludo no está en marcha.");
      }
    }
  }
  video.addEventListener("error", function () {
    fallo = true;
    escena.classList.remove("is-playing");
    decir(document.documentElement.getAttribute("data-lang") === "en"
      ? "Still image. The video could not be played."
      : "Imagen fija. El vídeo no se ha podido reproducir.");
    if (reproducir) reproducir.setAttribute("aria-pressed", "false");
  });
  if (reproducir) reproducir.addEventListener("click", function () {
    fallo = false;
    quiere = true;
    pausaUsuario = false;
    aplicar();
  });
  if (pausar) pausar.addEventListener("click", function () {
    pausaUsuario = true;
    aplicar();
  });
  if (fija) fija.addEventListener("click", function () {
    quiere = false;
    pausaUsuario = true;
    aplicar();
  });
  document.addEventListener("visibilitychange", aplicar);
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      aplicar();
    }, { threshold: 0 });
    var placa = document.querySelector(".placa");
    if (placa) obs.observe(placa);
  }
  if (!reducido) {
    quiere = true;
    aplicar();
  } else {
    decir(document.documentElement.getAttribute("data-lang") === "en"
      ? "Still image. Reduced motion is on; you can play the greeting if you want."
      : "Imagen fija. El movimiento reducido está activo; puedes ver el saludo si quieres.");
  }
})();
