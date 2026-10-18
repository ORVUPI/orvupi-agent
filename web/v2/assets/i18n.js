/* ORVUPI · idioma de la web. Sin dependencias. Ver docs/i18n/README.md.
   - La URL fija el idioma (/, /en/, /pt-br/, /ja/, /ko/). Nunca se redirige por ubicación.
   - La elección expresa se guarda en localStorage («orvupi-lang») y la comparte ORVUPI Work.
   - Sin preferencia guardada solo se SUGIERE el idioma del navegador (aviso que se puede cerrar).
   - Al cambiar de idioma se llevan los datos de los formularios a la página equivalente.
   - En pt-BR, ja y ko se descarga solo el diccionario del idioma activo para los textos que pintan los scripts. */
(function () {
  "use strict";
  var KEY = "orvupi-lang";
  var CARRY = "orvupi-lang-carry";
  var LOCALES = { es: "", en: "en", "pt-BR": "pt-br", ja: "ja", ko: "ko" };
  var NAMES = { es: "Español", en: "English", "pt-BR": "Português (Brasil)", ja: "日本語", ko: "한국어" };
  var SUGGEST = {
    es: "Esta página está disponible en Español.", en: "This page is available in English.",
    "pt-BR": "Esta página está disponível em Português (Brasil).", ja: "このページは日本語でもご覧いただけます。", ko: "이 페이지는 한국어로도 볼 수 있습니다."
  };
  var CLOSE = { es: "Cerrar", en: "Close", "pt-BR": "Fechar", ja: "閉じる", ko: "닫기" };
  var root = document.documentElement;
  var current = root.getAttribute("data-locale") || "es";

  function store(name, value) { try { if (value === null) localStorage.removeItem(name); else localStorage.setItem(name, value); } catch (e) { /* sin almacenamiento */ } }
  function read(name) { try { return localStorage.getItem(name); } catch (e) { return null; } }
  function basePath(path) {
    var m = path.match(/^\/(en|pt-br|ja|ko)(\/.*)?$/);
    return m ? (m[2] || "/") : path;
  }
  function urlFor(locale) {
    var pre = LOCALES[locale];
    return (pre ? "/" + pre : "") + basePath(location.pathname) + location.search + location.hash;
  }
  function match(tag) {
    if (!tag) return null;
    var low = String(tag).toLowerCase();
    if (low.indexOf("pt") === 0) return "pt-BR";
    var base = low.split("-")[0];
    return Object.prototype.hasOwnProperty.call(LOCALES, base) ? base : null;
  }
  // Migra la preferencia antigua (solo es/en) de la web anterior.
  var saved = read(KEY);
  if (!saved) {
    var legacy = read("orvupi-lab-lang");
    if (legacy === "en" || legacy === "es") { saved = legacy; store(KEY, legacy); }
  }
  if (saved && !Object.prototype.hasOwnProperty.call(LOCALES, saved)) saved = null;

  // Elección expresa guardada: al ENTRAR desde fuera se abre la versión elegida. Una sola vez por sesión, sin bucles.
  try {
    var internal = document.referrer && new URL(document.referrer).origin === location.origin;
    if (saved && saved !== current && !internal && !sessionStorage.getItem("orvupi-lang-hop")) {
      sessionStorage.setItem("orvupi-lang-hop", "1");
      location.replace(urlFor(saved));
      return;
    }
  } catch (e) { /* sigue en la página */ }

  function fields() {
    return Array.prototype.slice.call(document.querySelectorAll("input[id], textarea[id], select[id], input[name], textarea[name]"))
      .filter(function (el) { return el.type !== "password" && el.type !== "file" && el.type !== "hidden"; });
  }
  function carry() {
    var values = {};
    fields().forEach(function (el) {
      var id = el.id || "name:" + el.name;
      values[id] = el.type === "checkbox" || el.type === "radio" ? { c: el.checked } : { v: el.value };
    });
    try { sessionStorage.setItem(CARRY, JSON.stringify({ path: basePath(location.pathname), values: values, y: window.scrollY })); } catch (e) { /* nada */ }
  }
  function restore() {
    var raw;
    try { raw = sessionStorage.getItem(CARRY); sessionStorage.removeItem(CARRY); } catch (e) { return; }
    if (!raw) return;
    var data; try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || data.path !== basePath(location.pathname)) return;
    fields().forEach(function (el) {
      var item = data.values[el.id || "name:" + el.name];
      if (!item) return;
      if ("c" in item) el.checked = item.c; else if (el.value !== item.v) { el.value = item.v; el.dispatchEvent(new Event("input", { bubbles: true })); }
    });
    if (typeof data.y === "number") window.scrollTo(0, data.y);
  }

  function suggest() {
    if (saved || read("orvupi-lang-suggest-closed")) return;
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    var want = null;
    for (var i = 0; i < list.length && !want; i++) want = match(list[i]);
    if (!want || want === current) return;
    var box = document.createElement("div");
    box.className = "langsuggest";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", NAMES[want]);
    box.setAttribute("lang", want);
    var link = document.createElement("a");
    link.href = urlFor(want);
    link.setAttribute("hreflang", want);
    link.setAttribute("data-lang-link", want);
    link.textContent = SUGGEST[want];
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", CLOSE[current] || "Close");
    close.textContent = "×";
    close.addEventListener("click", function () { store("orvupi-lang-suggest-closed", "1"); box.remove(); });
    box.appendChild(link); box.appendChild(close);
    // En el flujo de la página (no flotante): no tapa botones ni formularios.
    var header = document.querySelector("header");
    if (header && header.parentNode) header.parentNode.insertBefore(box, header.nextSibling); else document.body.insertBefore(box, document.body.firstChild);
  }

  // Textos que los scripts escriben en inglés: diccionario del idioma activo, descargado solo aquí.
  function translateDynamic() {
    if (current === "es" || current === "en") return;
    fetch("/i18n/web/dyn-" + current + ".json", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (dict) {
      var ATTRS = ["aria-label", "placeholder", "title", "alt"];
      function tr(text) { var k = text.trim(); return k && Object.prototype.hasOwnProperty.call(dict, k) ? text.replace(k, dict[k]) : null; }
      function walk(node) {
        if (node.nodeType === 3) { var t = tr(node.nodeValue); if (t !== null) node.nodeValue = t; return; }
        if (node.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|INPUT)$/.test(node.nodeName) || node.isContentEditable) return;
        if (node.closest && node.closest("[data-user-content],[translate='no']")) return;
        ATTRS.forEach(function (a) { if (node.hasAttribute(a)) { var v = tr(node.getAttribute(a)); if (v !== null) node.setAttribute(a, v); } });
        for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
      }
      walk(document.body);
      new MutationObserver(function (list) {
        list.forEach(function (m) {
          if (m.type === "characterData") { var t = tr(m.target.nodeValue); if (t !== null && t !== m.target.nodeValue) m.target.nodeValue = t; }
          else if (m.type === "attributes") { walk(m.target); }
          else m.addedNodes.forEach(walk);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }).catch(function () { /* queda en inglés: es el respaldo */ });
  }

  // Español <-> inglés: las dos versiones llevan los dos textos, así que se cambia sin recargar
  // y sin perder nada de lo que hay en pantalla (lecturas de Verify, cuaderno, Studio…). La URL se actualiza.
  function inPage(lang) {
    if (!((lang === "es" || lang === "en") && (current === "es" || current === "en"))) return false;
    if (!document.querySelector(".lang.es") || !document.querySelector(".lang.en")) return false;
    var from = current;
    current = lang;
    root.setAttribute("lang", lang);
    root.setAttribute("data-lang", lang);
    root.setAttribute("data-locale", lang);
    var title = document.querySelector("title");
    var t = title && title.getAttribute("data-title-" + lang);
    if (t) title.textContent = t;
    try { history.replaceState(history.state, "", urlFor(lang)); } catch (e) { /* sin historial */ }
    var pre = function (p) { return p === "en" ? "/en" : ""; };
    document.querySelectorAll('a[href^="/"]:not([data-lang-link])').forEach(function (a) {
      var h = a.getAttribute("href");
      var base = basePath(h.split("#")[0].split("?")[0]);
      var rest = h.slice(h.split("#")[0].split("?")[0].length);
      if (/^\/(work|assets|fonts|i18n)\//.test(base)) return;
      if (h.indexOf(pre(from) + "/") === 0 || (from === "es" && !/^\/(en|pt-br|ja|ko)\//.test(h))) a.setAttribute("href", pre(lang) + base + rest);
    });
    document.querySelectorAll(".langpick a[data-lang-link]").forEach(function (l) {
      var code = l.getAttribute("data-lang-link");
      l.setAttribute("href", urlFor(code).replace(location.search + location.hash, ""));
      if (code === lang) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
    });
    var sum = document.querySelector(".langpick summary span[lang]");
    if (sum) { sum.setAttribute("lang", lang); sum.textContent = NAMES[lang]; }
    var det = document.querySelector(".langpick details");
    if (det) det.open = false;
    try { localStorage.setItem("orvupi-lab-lang", lang); } catch (e) { /* nada */ }
    document.dispatchEvent(new CustomEvent("orvupi-lang", { detail: lang }));
    return true;
  }

  function ready() {
    document.addEventListener("click", function (event) {
      var a = event.target && event.target.closest ? event.target.closest("a[data-lang-link]") : null;
      if (!a) return;
      var lang = a.getAttribute("data-lang-link");
      store(KEY, lang);
      store("orvupi-lang-suggest-closed", "1");
      event.preventDefault();
      if (inPage(lang)) return;
      carry();
      location.href = urlFor(lang);
    });
    restore();
    suggest();
    translateDynamic();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
