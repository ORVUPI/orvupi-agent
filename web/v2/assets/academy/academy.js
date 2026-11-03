/* ORVUPI Academy: navegación, búsqueda, preguntas, actividades, notas y progreso local.
   El progreso vive en localStorage («orvupi-academy-progreso»). Importar solo suma: nunca borra.
   El Cuaderno (IndexedDB «orvupi-cuaderno») solo se cuenta en lectura y solo si ya existe. */
(function () {
  "use strict";
  var KEY = "orvupi-academy-progreso";
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  doc.documentElement.classList.add("js");

  // ---------- progreso ----------
  function empty() { return { version: 1, leidos: {}, preguntas: {}, actividades: {}, modulos: {}, notas: {} }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var p = raw ? JSON.parse(raw) : null;
      if (!p || typeof p !== "object") return empty();
      var e = empty();
      Object.keys(e).forEach(function (k) { if (k !== "version" && (typeof p[k] !== "object" || !p[k])) p[k] = {}; });
      p.version = 1;
      return p;
    } catch (err) { return empty(); }
  }
  var state = load();
  var storageOk = true;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (err) { storageOk = false; }
    return storageOk;
  }
  function now() { return new Date().toISOString(); }
  function newer(a, b) { return String((a && a.at) || "") >= String((b && b.at) || ""); }
  function merge(base, inc) {
    // Suma sin borrar: por cada entrada se queda la más reciente; un acierto no se pierde.
    ["leidos", "preguntas", "actividades", "modulos", "notas"].forEach(function (k) {
      var src = inc && inc[k]; if (!src || typeof src !== "object") return;
      Object.keys(src).forEach(function (id) {
        var v = src[id], cur = base[k][id];
        if (k === "leidos") { if (typeof v === "string" && (!cur || v < cur)) base[k][id] = v; return; }
        if (!v || typeof v !== "object") return;
        if (!cur) { base[k][id] = v; return; }
        if (k === "notas") { if (newer(v, cur) && typeof v.texto === "string") base[k][id] = v; return; }
        var keep = newer(v, cur) ? v : cur;
        if ((cur.ok || cur.passed) && !(keep.ok || keep.passed)) keep = cur;
        if ((v.ok || v.passed) && !(keep.ok || keep.passed)) keep = v;
        base[k][id] = keep;
      });
    });
    return base;
  }

  function say(el, text) { if (el) el.textContent = text; }

  // ---------- cabecera ----------
  var search = $("[data-ac-search]");
  if (search) {
    var sb = $("button", search);
    sb.addEventListener("click", function () {
      var open = !search.classList.contains("open");
      search.classList.toggle("open", open); sb.setAttribute("aria-expanded", String(open));
      if (open) $("input", search).focus();
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && search.classList.contains("open")) { search.classList.remove("open"); sb.setAttribute("aria-expanded", "false"); sb.focus(); } });
  }
  var drawer = $("#ac-menu-movil"), veil = $(".ac-veil"), burger = $(".ac-burger");
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open); if (veil) veil.classList.toggle("open", open);
    if (burger) burger.setAttribute("aria-expanded", String(open));
    if (open) { var f = $("a,button", drawer); if (f) f.focus(); } else if (burger) burger.focus();
    if (!open && location.hash === "#ac-menu-movil") history.replaceState(null, "", location.pathname + location.search);
  }
  if (burger) burger.addEventListener("click", function (e) { e.preventDefault(); setDrawer(true); });
  $$("[data-ac-close]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); setDrawer(false); }); });
  doc.addEventListener("keydown", function (e) {
    if (!drawer || !drawer.classList.contains("open")) return;
    if (e.key === "Escape") setDrawer(false);
    if (e.key === "Tab") {
      var f = $$("a[href],button,input,select", drawer); if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  if (location.hash === "#ac-menu-movil") setDrawer(true);
  $$("form[data-ac-goto]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = ($("input", f).value || "").trim();
      location.href = f.getAttribute("action") + (q ? "?q=" + encodeURIComponent(q) : "");
    });
  });
  var params = new URLSearchParams(location.search);
  function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

  // ---------- lista de artículos ----------
  var flt = $("form[data-ac-filter]"), list = $("[data-ac-list]");
  if (flt && list) {
    var cards = $$(".ac-lcard", list), count = $("#art-n"), none = $("[data-ac-none]"), sort = $("[data-ac-sort]");
    ["q", "modulo", "nivel"].forEach(function (k) { var v = params.get(k); if (v && flt.elements[k]) flt.elements[k].value = v; });
    var apply = function () {
      var q = norm(flt.elements.q.value.trim()), m = flt.elements.modulo.value, n = flt.elements.nivel.value, shown = 0;
      cards.forEach(function (c) {
        var ok = (!q || norm(c.getAttribute("data-search")).indexOf(q) !== -1) && (!m || c.getAttribute("data-mod") === m) && (!n || c.getAttribute("data-nivel") === n);
        c.hidden = !ok; if (ok) shown++;
      });
      say(count, "Artículos (" + shown + ")"); if (none) none.hidden = shown !== 0;
      var u = new URLSearchParams(); if (q) u.set("q", flt.elements.q.value.trim()); if (m) u.set("modulo", m); if (n) u.set("nivel", n);
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
    };
    flt.addEventListener("input", apply); flt.addEventListener("change", apply);
    flt.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
    flt.addEventListener("reset", function () { setTimeout(apply, 0); });
    if (sort) sort.addEventListener("change", function () {
      var by = sort.value;
      cards.slice().sort(function (a, b) {
        return by === "az" ? $("h3", a).textContent.localeCompare($("h3", b).textContent, "es") : a.getAttribute("data-orden") - b.getAttribute("data-orden");
      }).forEach(function (c) { list.appendChild(c); });
    });
    apply();
  }

  // ---------- glosario ----------
  var gf = $("[data-ac-gfilter]"), gl = $("[data-ac-glist]");
  if (gf && gl) {
    var secs = $$("section[data-term]", gl), gnone = $("[data-ac-none]", gl);
    var gapply = function () {
      var q = norm(gf.value.trim()), shown = 0;
      secs.forEach(function (s) { var ok = !q || norm(s.getAttribute("data-term")).indexOf(q) !== -1; s.hidden = !ok; if (ok) shown++; });
      $$(".ac-tl", gl).forEach(function (g) { g.hidden = !$$("section[data-term]", g).some(function (s) { return !s.hidden; }); });
      if (gnone) gnone.hidden = shown !== 0;
    };
    if (params.get("q")) gf.value = params.get("q");
    gf.addEventListener("input", gapply); gapply();
    // Anclas del antiguo /aprender/: las guías pasan a artículos; los términos conservan su ancla aquí.
    var legacy = gl.getAttribute("data-legacy");
    if (legacy && location.hash) {
      try { var map = JSON.parse(legacy); var to = map[location.hash.slice(1)]; if (to) location.replace(to); } catch (err) { /* sin mapa */ }
    }
  }

  // ---------- preguntas ----------
  function markOpt(label, ok) { label.classList.remove("ok", "ko"); if (ok !== null) label.classList.add(ok ? "ok" : "ko"); }
  $$("[data-quiz]").forEach(function (box) {
    var id = box.getAttribute("data-quiz"), fb = $(".ac-fb", box), btn = $("[data-check]", box);
    var prev = state.preguntas[id];
    if (prev && prev.ok) say(fb, "Ya la acertaste. Puedes repetirla.");
    btn.addEventListener("click", function () {
      var sel = $("input:checked", box);
      $$(".ac-opt", box).forEach(function (l) { markOpt(l, null); });
      if (!sel) { fb.className = "ac-fb ko"; say(fb, "Elige una respuesta."); return; }
      var ok = sel.hasAttribute("data-ok");
      markOpt(sel.closest(".ac-opt"), ok);
      if (ok) markOpt(sel.closest(".ac-opt"), true);
      fb.className = "ac-fb " + (ok ? "ok" : "ko");
      say(fb, (ok ? "Correcto. " : "No es esa. ") + sel.getAttribute("data-porque"));
      var was = state.preguntas[id];
      state.preguntas[id] = { ok: ok || !!(was && was.ok), ultima: ok, at: now() };
      save();
    });
  });
  $$("[data-exam]").forEach(function (box) {
    var id = box.getAttribute("data-exam"), pass = Number(box.getAttribute("data-pass")) || 5, total = $("[data-total]", box);
    var n = id.replace(/^M/, "");
    var prev = state.modulos[n];
    if (prev && prev.passed) { total.className = "ac-fb ok"; say(total, "Superada antes con " + prev.score + " aciertos. Puedes repetirla."); }
    $("[data-check]", box).addEventListener("click", function () {
      var qs = $$("fieldset", box), score = 0, missing = 0;
      qs.forEach(function (fs) {
        var sel = $("input:checked", fs), fb = $(".ac-fb", fs);
        $$(".ac-opt", fs).forEach(function (l) { markOpt(l, null); });
        if (!sel) { missing++; fb.className = "ac-fb ko"; say(fb, "Sin responder."); return; }
        var ok = sel.hasAttribute("data-ok"); if (ok) score++;
        markOpt(sel.closest(".ac-opt"), ok);
        fb.className = "ac-fb " + (ok ? "ok" : "ko"); say(fb, (ok ? "Correcto. " : "No es esa. ") + sel.getAttribute("data-porque"));
      });
      var passed = score >= pass;
      total.className = "ac-fb " + (passed ? "ok" : "ko");
      say(total, score + " de " + qs.length + " aciertos. " + (passed ? "Módulo superado." : "Necesitas " + pass + ". Repasa y vuelve a intentarlo.") + (missing ? " Faltan " + missing + " por responder." : ""));
      var was = state.modulos[n];
      if (!was || passed || !was.passed) state.modulos[n] = { score: Math.max(score, (was && was.passed && !passed) ? was.score : score), passed: passed || !!(was && was.passed), at: now() };
      save(); paint();
    });
  });

  // ---------- actividades ----------
  $$("[data-activity]").forEach(function (box) {
    var id = box.getAttribute("data-activity"), fb = $(".ac-fb", box);
    $("[data-check]", box).addEventListener("click", function () {
      var items = $$(".ac-items li", box), good = 0, empty = 0;
      items.forEach(function (li) {
        var s = $("select", li), why = $(".why", li);
        li.classList.remove("ok", "ko");
        if (!s.value) { empty++; why.hidden = true; return; }
        var ok = s.value === s.getAttribute("data-ok"); if (ok) good++;
        li.classList.add(ok ? "ok" : "ko"); why.hidden = false;
        why.textContent = (ok ? "Bien. " : "Era «" + s.getAttribute("data-ok") + "». ") + why.getAttribute("data-why");
      });
      var all = good === items.length;
      fb.className = "ac-fb " + (all ? "ok" : "ko");
      say(fb, good + " de " + items.length + " correctas." + (empty ? " Te faltan " + empty + "." : "") + (all ? " ¡Hecho!" : ""));
      var was = state.actividades[id];
      state.actividades[id] = { ok: all || !!(was && was.ok), aciertos: good, total: items.length, at: now() };
      save(); paint();
    });
    $$(".why", box).forEach(function (w) { w.setAttribute("data-why", w.textContent); });
  });

  // ---------- notas y leído ----------
  $$("textarea[data-notes]").forEach(function (ta) {
    var id = ta.getAttribute("data-notes"), st = $("[data-status]", ta.closest(".ac-notes")), t = null;
    if (state.notas[id]) ta.value = state.notas[id].texto || "";
    ta.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!ta.value.trim() && !state.notas[id]) return;
        state.notas[id] = { texto: ta.value, at: now() };
        say(st, save() ? "Nota guardada en este navegador." : "No se pudo guardar: el navegador no permite almacenamiento.");
      }, 400);
    });
  });
  $$("[data-read]").forEach(function (b) {
    var id = b.getAttribute("data-read"), st = $("[data-status]", b.closest(".ac-notes"));
    var label = function () { b.textContent = state.leidos[id] ? "Leído ✓" : "Marcar como leído"; };
    label();
    b.addEventListener("click", function () {
      if (!state.leidos[id]) state.leidos[id] = now();
      say(st, save() ? "Artículo marcado como leído." : "No se pudo guardar el progreso.");
      label(); paint();
    });
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var u = b.getAttribute("data-copy");
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { b.setAttribute("aria-label", "Enlace copiado"); }, function () {});
    });
  });

  // ---------- marcas de progreso ----------
  function paint() {
    $$("[data-unit]").forEach(function (el) { el.classList.toggle("is-done", !!state.leidos[el.getAttribute("data-unit")]); });
    $$("[data-unit-done]").forEach(function (el) { el.classList.toggle("is-on", !!state.leidos[el.getAttribute("data-unit-done")]); });
    $$("[data-practica]").forEach(function (el) { var a = state.actividades[el.getAttribute("data-practica")]; el.classList.toggle("is-done", !!(a && a.ok)); });
    $$("[data-prac-done]").forEach(function (el) { var a = state.actividades[el.getAttribute("data-prac-done")]; el.classList.toggle("is-on", !!(a && a.ok)); });
    $$(".ac-row[data-modulo]").forEach(function (el) { var m = state.modulos[el.getAttribute("data-modulo")]; el.classList.toggle("is-done", !!(m && m.passed)); });
    var mods = $("[data-ac-mods]");
    if (mods) { var rows = $$(".ac-row[data-modulo]"); mods.textContent = rows.filter(function (r) { return r.classList.contains("is-done"); }).length + " de " + rows.length; }
    var cont = $("[data-ac-continue]");
    if (cont) {
      var links = $$(".ac-row a[data-unit]"), next = links.filter(function (a) { return !state.leidos[a.getAttribute("data-unit")]; })[0];
      if (next && next !== links[0]) { cont.href = next.getAttribute("href"); cont.textContent = "Continuar la ruta"; }
      else if (!next && links.length) { cont.textContent = "Repasar la ruta"; }
    }
  }
  paint();

  // ---------- Mi aprendizaje ----------
  var me = $("[data-ac-me]");
  if (me) {
    var k = function (n) { return $('[data-k="' + n + '"]', me); };
    var st = $("[data-status]", me);
    var render = function (data) {
      var units = data ? data.unidades : [];
      var byId = {}; units.forEach(function (u) { byId[u.id] = u; });
      say(k("leidos"), String(Object.keys(state.leidos).length));
      say(k("preguntas"), String(Object.keys(state.preguntas).filter(function (i) { return state.preguntas[i].ok; }).length));
      say(k("modulos"), String(Object.keys(state.modulos).filter(function (i) { return state.modulos[i].passed; }).length));
      say(k("practicas"), String(Object.keys(state.actividades).filter(function (i) { return /^P\d+$/.test(i) && state.actividades[i].ok; }).length));
      var next = units.filter(function (u) { return !state.leidos[u.id]; })[0];
      var sig = k("siguiente"); sig.textContent = "";
      if (!units.length) sig.textContent = "Dato no disponible";
      else if (next) { sig.appendChild(doc.createTextNode("Siguiente artículo: ")); var a = doc.createElement("a"); a.href = next.u; a.textContent = next.t; sig.appendChild(a); }
      else sig.textContent = "Has leído todos los artículos de la ruta.";
      var box = k("notas"), ids = Object.keys(state.notas).filter(function (i) { return (state.notas[i].texto || "").trim(); });
      if (ids.length) {
        box.textContent = ""; var ul = doc.createElement("ul");
        ids.forEach(function (i) {
          var li = doc.createElement("li"), a = doc.createElement("a"), u = byId[i];
          a.href = u ? u.u + "#h-notas-" + i : "#"; a.textContent = u ? u.t : i;
          li.appendChild(a); li.appendChild(doc.createTextNode(": " + state.notas[i].texto.slice(0, 160) + (state.notas[i].texto.length > 160 ? "…" : "")));
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
    };
    var labInfo = function () {
      // Progreso del antiguo Lab: solo lectura de sus claves (orvupi-lab-*).
      var n = 0, solved = 0, done = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (!key || key.indexOf("orvupi-lab-") !== 0 || key === "orvupi-lab-lang") continue;
          try { var v = JSON.parse(localStorage.getItem(key)); if (v && typeof v === "object") { n++; solved += Array.isArray(v.solved) ? v.solved.length : 0; if (v.completed) done++; } } catch (e) { /* clave ajena */ }
        }
      } catch (e) { return "Dato no disponible"; }
      return n ? n + " actividades del laboratorio empezadas, " + done + " completadas y " + solved + " pasos resueltos." : "Aún no has empezado el laboratorio en este navegador.";
    };
    say(k("lab"), labInfo());
    var cu = k("cuaderno");
    if (!window.indexedDB || !indexedDB.databases) say(cu, "Abre el cuaderno para ver tus fichas guardadas.");
    else indexedDB.databases().then(function (dbs) {
      if (!dbs.some(function (d) { return d.name === "orvupi-cuaderno"; })) { say(cu, "Aún no has guardado fichas en este navegador."); return; }
      var req = indexedDB.open("orvupi-cuaderno");
      req.onupgradeneeded = function (e) { e.target.transaction.abort(); };
      req.onerror = function () { say(cu, "Dato no disponible"); };
      req.onsuccess = function () {
        var db = req.result;
        try {
          if (!db.objectStoreNames.contains("records")) { say(cu, "Dato no disponible"); db.close(); return; }
          var c = db.transaction("records", "readonly").objectStore("records").count();
          c.onsuccess = function () { say(cu, c.result + (c.result === 1 ? " ficha guardada." : " fichas guardadas.")); db.close(); };
          c.onerror = function () { say(cu, "Dato no disponible"); db.close(); };
        } catch (e) { say(cu, "Dato no disponible"); db.close(); }
      };
    }, function () { say(cu, "Dato no disponible"); });
    var data = null;
    fetch("/academy/datos.json", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { data = d; render(d); }, function () { render(null); });
    render(null);
    $("[data-export]", me).addEventListener("click", function () {
      var blob = new Blob([JSON.stringify({ formato: "orvupi-academy-progreso", version: 1, exportado: now(), progreso: state }, null, 2)], { type: "application/json" });
      var a = doc.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "orvupi-academy-progreso.json";
      doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      say(st, "Archivo exportado.");
    });
    $("[data-import]", me).addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > 2000000) { say(st, "El archivo es demasiado grande."); return; }
      f.text().then(function (txt) {
        var j = JSON.parse(txt);
        if (!j || j.formato !== "orvupi-academy-progreso" || !j.progreso) throw new Error("formato");
        merge(state, j.progreso);
        say(st, save() ? "Progreso importado y sumado al que ya tenías." : "No se pudo guardar el progreso importado.");
        render(data); paint();
      }).catch(function () { say(st, "Ese archivo no es una copia de ORVUPI Academy. No se ha cambiado nada."); });
      e.target.value = "";
    });
  }

  // Índice del artículo: marca la sección visible.
  var toc = $(".ac-toc");
  if (toc && "IntersectionObserver" in window) {
    var links = $$("a", toc), map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting && map[en.target.id]) { links.forEach(function (a) { a.removeAttribute("aria-current"); }); map[en.target.id].setAttribute("aria-current", "true"); } });
    }, { rootMargin: "-90px 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var el = doc.getElementById(id); if (el) io.observe(el); });
  }
  window.ORVUPIAcademy = { merge: merge, key: KEY };
})();
