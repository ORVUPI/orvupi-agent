function verifyEl(tag, attrs) {
  var node = document.createElement(tag);
  if (!attrs) return node;
  Object.keys(attrs).forEach(function (key) {
    if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
  });
  return node;
}

function verifyLang() {
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";
}

function legendItem(light, text) {
  var item = verifyEl("li", { "data-luz": light });
  item.textContent = text;
  return item;
}

function entenderResultado(lang) {
  var titleText = lang === "en" ? "Understand this result" : "Entender este resultado";
  var understand = verifyEl("nav", {
    id: "entender-resultado",
    class: "entender-resultado",
    "aria-label": titleText,
  });
  var button = verifyEl("button", { type: "button", class: "abrir-entender" });
  button.textContent = titleText;
  var panel = verifyEl("div", { class: "explicacion-resultado", tabindex: "-1", hidden: "hidden" });
  var lines = lang === "en"
    ? [
      "Permissions: the mint permission can create more tokens. The freeze permission can block accounts. Neither one says the project is legitimate.",
      "Supply: it is the total number of tokens in this reading, using this token's decimals.",
      "Metadata: if they can change, the name or symbol in this reading may not be tomorrow's.",
      "Distribution: a sample of accounts is not a census of who holds the tokens.",
      "Curve: if the token was not created on Pump.fun, this fact does not apply. If it was and there is no account, this reading did not find it.",
    ]
    : [
      "Permisos: el de emisión permite crear más tokens. El de congelación permite bloquear cuentas. Ninguno de los dos dice si el proyecto es legítimo.",
      "Suministro: es la cantidad total de tokens en esta lectura, con los decimales de este token.",
      "Metadatos: si se pueden cambiar, puede que mañana el nombre o el símbolo ya no sean los de esta lectura.",
      "Distribución: una muestra de cuentas no es un censo de quién tiene los tokens.",
      "Curva: si el token no se creó en Pump.fun, este dato no aplica. Si se creó y no hay cuenta, esta lectura no la encontró.",
    ];
  var topics = ["permisos", "suministro", "metadatos", "distribucion", "curva"];
  lines.forEach(function (line, index) {
    var paragraph = verifyEl("p", { "data-tema": topics[index], id: "entender-" + topics[index], tabindex: "-1" });
    paragraph.textContent = line;
    panel.append(paragraph);
  });
  [
    ["/aprender/#guia-permisos", "Permisos", "Permissions"],
    ["/aprender/#autoridad-emision", "Suministro", "Supply"],
    ["/aprender/#metadatos-mutables", "Metadatos", "Metadata"],
    ["/aprender/#censo", "Distribución (guía Censo)", "Distribution (Census guide)"],
    ["/aprender/#curva-pump", "Curva", "Curve"],
  ].forEach(function (item) {
    var link = verifyEl("a", { href: item[0], "data-guia": item[0] });
    link.textContent = lang === "en" ? item[2] : item[1];
    panel.append(link);
  });
  button.addEventListener("click", function () {
    panel.hidden = false;
    panel.focus();
  });
  understand.append(button, panel);
  return understand;
}

function paintMarketBlock(out, view) {
  if (typeof mountMarket !== "function") return;
  if (!view || !view.mint || view.light === "espera") return;
  if (view.kind === "vacio" || view.kind === "invalida" || view.kind === "comprobando" || view.kind === "evm") return;
  if (typeof isAddress === "function" && !isAddress(view.mint)) return;
  var slot = verifyEl("div", { class: "hueco-mercado" });
  out.append(slot);
  mountMarket(slot, { mint: view.mint, lang: verifyLang(), auto: false });
}

function paintSummary(out, view, lang) {
  if (typeof renderReadingSummary !== "function" || typeof buildReadingSummary !== "function") return;
  if (view.light === "espera" || view.kind === "vacio" || view.kind === "invalida" || view.kind === "comprobando") return;
  var live = Array.isArray(view.facts) || view.kind === "red" || view.kind === "limite" || view.kind === "tiempo";
  if (!live) return;
  var model = buildReadingSummary(view);
  var section = renderReadingSummary(out, model, lang, { retryId: "reintentar" });
  mountReport(section, {
    summary: model,
    mint: typeof view.mint === "string" ? view.mint : "",
    consultedAt: view.shown && typeof view.shown.consultedAt === "string" ? view.shown.consultedAt : (view.fetchedAt || ""),
    network: "solana",
  });
}

var reportTicket = 0;
function mountReport(section, detail) {
  if (!section) return;
  var ticket = ++reportTicket;
  section.dataset.informe = String(ticket);
  import("/shared/informe.js").then(function (mod) {
    if (!section.isConnected || section.dataset.informe !== String(ticket)) return;
    var previous = section.querySelector(".informe-descarga");
    if (previous) previous.remove();
    section.append(mod.reportDownloadBox(detail, { document: document, navigator: navigator }));
  }).catch(function () {});
}

function paintVerify(out, view) {
  var lang = verifyLang();
  out.replaceChildren();
  out.setAttribute("data-state", view.kind);
  out.setAttribute("data-luz", view.light);
  out.setAttribute("aria-busy", view.light === "espera" || view.kind === "comprobando" ? "true" : "false");
  if (view.kind === "vacio") {
    var emptyTitle = verifyEl("h2");
    emptyTitle.textContent = view.title[lang];
    var emptySupport = verifyEl("p", { class: "apoyo" });
    emptySupport.textContent = view.support[lang];
    var list = verifyEl("ul", { class: "leyenda" });
    list.append(
      legendItem("ok", lang === "en" ? "ORVUPI registry address" : "Dirección del registro de ORVUPI"),
      legendItem("atencion", lang === "en" ? "Named like ORVUPI, but not the official address" : "Se llama como ORVUPI, pero no es la dirección oficial"),
      legendItem("neutro", lang === "en" ? "Could not be checked" : "No se pudo comprobar"),
    );
    out.append(emptyTitle, emptySupport, list);
    return;
  }
  var flag = verifyEl("p", { class: "semaforo" });
  var dot = verifyEl("span", { class: "luz", "aria-hidden": "true" });
  var name = verifyEl("span");
  name.textContent = view.lightLabel[lang];
  flag.append(dot, name);
  var title = verifyEl("h2", { tabindex: "-1" });
  title.textContent = view.title[lang];
  var support = verifyEl("p", { class: "apoyo" });
  support.textContent = view.support[lang];
  out.append(flag, title, support);
  if (view.compare && view.compare.marks) {
    var compared = verifyEl("p", { class: "mint comparado" });
    view.compare.marks.forEach(function (mark) {
      var span = verifyEl("span");
      if (mark.changed) span.className = "cambia";
      span.textContent = mark.char;
      compared.append(span);
    });
    out.append(compared);
  } else if (view.mint) {
    var mint = verifyEl("p", { class: "mint" });
    mint.textContent = view.mint;
    out.append(mint);
  }
  if (view.partialNote) {
    var note = verifyEl("p", { class: "nota" });
    note.textContent = view.partialNote[lang];
    out.append(note);
  }
  paintSummary(out, view, lang);
  paintMarketBlock(out, view);
  if (view.signals && view.signals.length) {
    var signals = verifyEl("div", { class: "senales" });
    view.signals.forEach(function (signal) {
      var card = verifyEl("article", { class: signal.tone ? "senal " + signal.tone : "senal", "data-nivel": signal.level });
      var heading = verifyEl("h3");
      heading.textContent = signal.title[lang];
      var body = verifyEl("p");
      body.textContent = signal.explain[lang];
      card.append(heading, body);
      signals.append(card);
    });
    out.append(signals);
  }
  if (view.identity) {
    var identity = verifyEl("p", { class: "franja-identidad" });
    identity.textContent = view.identity[lang];
    out.append(identity);
  }
  if (view.canSample) {
    var sampleBtn = verifyEl("button", { type: "button", id: "leer-cuentas" });
    sampleBtn.textContent = lang === "en" ? "Try to read the largest accounts" : "Intentar leer las cuentas más grandes";
    out.append(sampleBtn);
  }
  var isOfficial = !!view.mint && typeof isOfficialAddress === "function" && isOfficialAddress(view.mint);
  var noLiveRead = !!view.mint && (view.kind === "lectura_caida" || view.kind === "sin_ficha");
  var officialDown = noLiveRead && isOfficial;
  var failedRead = noLiveRead || view.missingState === "falta" || view.kind === "red" || view.kind === "limite" || view.kind === "tiempo";
  if (failedRead && view.light !== "espera" && !out.querySelector("#reintentar")) {
    var retry = verifyEl("button", { type: "button", id: "reintentar" });
    retry.textContent = lang === "en" ? "Try again" : "Reintentar";
    out.append(retry);
  }
  if (view.kind !== "vacio" && typeof AUDIT_NOTICE !== "undefined") {
    var audit = verifyEl("p", { class: "aviso-fijo" });
    audit.textContent = officialDown
      ? (lang === "en"
        ? "The blockchain could not be read right now. This is the official ORVUPI address published on orvupi.com/token. Press «Try again»."
        : "No se pudo leer la blockchain ahora. Esta es la dirección oficial de ORVUPI publicada en orvupi.com/token. Pulsa «Reintentar».")
      : noLiveRead
      ? (lang === "en"
        ? "The blockchain could not be read right now. This address is not the official ORVUPI address (the official one is on orvupi.com/token). Press «Try again»."
        : "No se pudo leer la blockchain ahora. Esta dirección no es la oficial de ORVUPI (la oficial está en orvupi.com/token). Pulsa «Reintentar».")
      : isOfficial
      ? (lang === "en"
        ? "Live reading of public blockchain data. It is not an audit, a recommendation, or an endorsement. This is the official ORVUPI address published on orvupi.com/token."
        : "Lectura en directo de datos públicos de la blockchain. No es una auditoría, ni una recomendación, ni un aval. Esta es la dirección oficial de ORVUPI publicada en orvupi.com/token.")
      : AUDIT_NOTICE[lang];
    out.append(audit);
  }
  if (view.mint && view.kind === "lectura" && view.light !== "espera") {
    var actions = verifyEl("div", { class: "acciones-consulta" });
    function actionButton(id, es, en) {
      var button = verifyEl("button", { type: "button", id: id, "data-mint": view.mint });
      button.textContent = lang === "en" ? en : es;
      return button;
    }
    var understand = entenderResultado(lang);
    var notice = document.getElementById("aviso-guardar");
    if (notice) {
      var copy = notice.cloneNode(true);
      copy.removeAttribute("id");
      actions.append(copy);
    }
    actions.append(
      actionButton("guardar-consulta", "Guardar esta consulta", "Save this lookup"),
      actionButton("comparar-anterior", "Comparar con la anterior", "Compare with the previous one"),
      actionButton("ver-cambio", "Ver qué cambió", "See what changed"),
      understand,
    );
    var compareOut = verifyEl("div", { id: "comparacion-verify" });
    out.append(actions, compareOut);
  }
  if (view.rows && view.rows.length > 0) {
    var details = verifyEl("details", { class: "tecnico" });
    var summary = verifyEl("summary");
    summary.textContent = lang === "en" ? "Technical details" : "Detalles técnicos";
    var rows = verifyEl("dl");
    view.rows.forEach(function (row) {
      var term = verifyEl("dt");
      term.textContent = row.label[lang];
      var detail = verifyEl("dd");
      if ((row.value[lang] || "").includes("«")) detail.className = "ajeno";
      detail.textContent = row.value[lang];
      rows.append(term, detail);
    });
    details.append(summary, rows);
    out.append(details);
  }
  if (view.light !== "espera" && view.kind !== "vacio" && view.kind !== "lectura" && view.kind !== "invalida") {
    out.append(entenderResultado(lang));
  }
}

function bootVerify() {
  var out = document.getElementById("resultado");
  var form = document.getElementById("consulta");
  var input = document.getElementById("direccion-token");
  if (!out || !form || !input || typeof ORVUPI_VERIFY === "undefined") return;
  var cards = ORVUPI_VERIFY.cards || [];
  var evm = ORVUPI_VERIFY.evm || [];
  var source = cards.length > 0 ? "lista" : "caida";

  var last = emptyView();
  var fieldError = document.getElementById("direccion-error");

  function coverHeight() {
    var header = document.querySelector("header.site");
    if (!header) return 0;
    var pos = window.getComputedStyle(header).position;
    if (pos !== "fixed" && pos !== "sticky") return 0;
    return Math.ceil(header.getBoundingClientRect().height);
  }

  function revealVerdict() {
    out.style.scrollMarginTop = coverHeight() + "px";
    out.scrollIntoView({ block: "start", inline: "nearest" });
    var title = out.querySelector("h2");
    if (title && title.focus) title.focus({ preventScroll: true });
  }

  function showFieldError() {
    if (fieldError) fieldError.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "direccion-error");
    if (input.focus) input.focus();
  }

  function hideFieldError() {
    if (fieldError) fieldError.hidden = true;
    input.removeAttribute("aria-describedby");
  }

  function apply(view, reveal) {
    last = view;
    document.dispatchEvent(new CustomEvent("orvupi-lectura", { detail: view && view.shown ? view.shown : null }));
    paintVerify(out, view);
    input.setAttribute("aria-invalid", view.kind === "invalida" ? "true" : "false");
    if (reveal && view.kind !== "vacio" && view.kind !== "comprobando") revealVerdict();
  }

  var generation = 0;

  function datedSignal(cardView, card) {
    var createdAt = card && typeof card.createdAt === "string" ? card.createdAt.trim() : "";
    if (!createdAt) return null;
    if (cardView.kind === "oficial") {
      return {
        id: "ficha",
        level: "ok",
        cardDate: createdAt,
        title: { es: "Ficha fechada", en: "Dated card" },
        explain: {
          es: "Hay una ficha fechada de esta misma dirección. Es una foto anterior, no esta lectura.",
          en: "There is a dated card for this same address. It is an earlier snapshot, not this reading.",
        },
      };
    }
    if (cardView.kind === "copia") {
      return {
        id: "ficha",
        level: "atencion",
        cardDate: createdAt,
        title: {
          es: "La ficha fechada también dice que se parece a otro token y no es su dirección",
          en: "The dated card also says it looks like another token and is not its address",
        },
        explain: cardView.support,
      };
    }
    if (cardView.kind === "otra") {
      return {
        id: "ficha",
        level: "neutro",
        cardDate: createdAt,
        title: { es: "Hay una ficha fechada y no es la del registro", en: "There is a dated card and it is not the registry one" },
        explain: cardView.support,
      };
    }
    return null;
  }

  var stamps = [];
  var memory = new Map();
  var currentAbort = null;
  var inFlight = false;

  function submitButton() {
    return form.querySelector("button[type='submit']");
  }

  function setBusy(busy) {
    inFlight = busy;
    var submit = submitButton();
    if (submit) submit.disabled = busy;
    var extra = out.querySelector("#leer-cuentas");
    if (extra) extra.disabled = busy;
    var retry = out.querySelector("#reintentar");
    if (retry) retry.disabled = busy;
    var save = out.querySelector("#guardar-consulta");
    if (save) save.disabled = busy;
  }

  function pauseView(mint) {
    return {
      ok: false,
      kind: "limite",
      mint: mint,
      light: "neutro",
      lightLabel: { es: "No se pudo comprobar", en: "Could not be checked" },
      title: { es: "No se pudo comprobar", en: "Could not be checked" },
      support: {
        es: "Se han hecho 6 lecturas en un minuto. Espera un momento antes de comprobar otra. No se ha inventado un resultado.",
        en: "6 readings were made in one minute. Wait a moment before checking another. No result was invented.",
      },
      signals: [],
      rows: [],
      endpointHost: null,
      usedFallback: false,
      slot: null,
      fetchedAt: null,
      sources: [],
      canSample: false,
    };
  }

  function endpointsOf() {
    var rpc = ORVUPI_VERIFY.rpc || {};
    return [rpc.primary, rpc.fallback].filter(function (item) { return !!item; });
  }

  function decorate(view, normalized) {
    var cardView = classifyAddress(normalized, cards, "lista", evm);
    if (cardView.compare) view.compare = cardView.compare;
    var card = null;
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i] && cards[i].mint === normalized) card = cards[i];
    }
    var extra = datedSignal(cardView, card);
    if (extra && view.ok && view.signals) view.signals = view.signals.concat([extra]);
    return view;
  }

  function run(force, forgetBlocked) {
    if (inFlight) return;
    if (input.value.trim() === "") {
      apply(emptyView(), false);
      showFieldError();
      return;
    }
    hideFieldError();
    var value = input.value;
    var ticket = ++generation;
    if (typeof readAnyMint !== "function" || typeof loadingView !== "function") {
      apply(pendingView(value), false);
      window.requestAnimationFrame(function () {
        try {
          apply(classifyAddress(value, cards, source, evm), true);
        } catch (error) {
          apply(classifyAddress(value, [], "caida", evm), true);
        }
      });
      return;
    }
    var normalized = normalizeAddress(value);
    if (!normalized || /^0x/i.test(normalized) || !isAddress(normalized)) {
      apply(classifyAddress(value, cards, source, evm), true);
      return;
    }
    var now = Date.now();
    var cached = !force && typeof readCache === "function" ? readCache(memory, normalized, now, 60000) : null;
    if (cached) {
      apply(cached, true);
      return;
    }
    var slot = typeof takeQuerySlot === "function" ? takeQuerySlot(stamps, now, 6, 60000) : { allowed: true, stamps: stamps };
    stamps = slot.stamps;
    if (!slot.allowed) {
      apply(pauseView(normalized), true);
      return;
    }
    if (forgetBlocked) clearRpcBlocks();
    if (currentAbort) currentAbort.abort();
    var controller = new AbortController();
    currentAbort = controller;
    setBusy(true);
    apply(loadingView(normalized), true);
    var endpoints = endpointsOf();
    readAnyMint({
      mint: normalized,
      registry: ORVUPI_VERIFY.registry || [],
      endpoints: endpoints,
      maxRetries: 1,
      minIntervalMs: 200,
      timeoutMs: 8000,
      signal: controller.signal,
    }).then(function (reading) {
      if (ticket !== generation || controller.signal.aborted) return;
      if (!reading.ok) {
        apply(reserveWhenLiveFails(classifyAddress(normalized, cards, "lista", evm)), true);
        return;
      }
      var view = decorate(reading, normalized);
      if (view.ok) memory.set(normalized, { at: Date.now(), value: view });
      apply(view, true);
    }).catch(function () {
      if (ticket !== generation || controller.signal.aborted) return;
      apply(reserveWhenLiveFails(classifyAddress(normalized, cards, "lista", evm)), true);
    }).then(function () {
      if (ticket === generation) setBusy(false);
    });
  }

  function readSample() {
    if (inFlight || !last || !last.canSample || !last.mint) return;
    var now = Date.now();
    var slot = typeof takeQuerySlot === "function" ? takeQuerySlot(stamps, now, 6, 60000) : { allowed: true, stamps: stamps };
    stamps = slot.stamps;
    if (!slot.allowed) {
      apply(pauseView(last.mint), true);
      return;
    }
    if (typeof readLargestAccounts !== "function") return;
    var ticket = ++generation;
    if (currentAbort) currentAbort.abort();
    var controller = new AbortController();
    currentAbort = controller;
    setBusy(true);
    var mint = last.mint;
    readLargestAccounts({
      mint: mint,
      registry: ORVUPI_VERIFY.registry || [],
      endpoints: endpointsOf(),
      maxRetries: 1,
      minIntervalMs: 200,
      timeoutMs: 6000,
      signal: controller.signal,
    }).then(function (signal) {
      if (ticket !== generation || controller.signal.aborted) return;
      var view = last;
      view.signals = (view.signals || []).map(function (item) {
        return item.id === "cuentas" ? signal : item;
      });
      view.canSample = false;
      memory.set(mint, { at: Date.now(), value: view });
      apply(view, true);
    }).catch(function () {
      if (ticket !== generation || controller.signal.aborted) return;
      var view = last;
      var failed = {
        id: "cuentas",
        level: "atencion",
        title: { es: "No se pudo comprobar", en: "Could not be checked" },
        explain: {
          es: "El servicio público no respondió, prueba otra vez en un minuto. No es una concentración de cero.",
          en: "The public service did not respond, try again in a minute. It is not zero concentration.",
        },
      };
      view.signals = (view.signals || []).map(function (item) {
        return item.id === "cuentas" ? failed : item;
      });
      view.canSample = false;
      apply(view, true);
    }).then(function () {
      if (ticket === generation) setBusy(false);
    });
  }

  out.addEventListener("click", function (event) {
    var target = event.target;
    if (target && target.id === "leer-cuentas") readSample();
    if (target && target.id === "reintentar") {
      if (last && last.mint) memory.delete(last.mint);
      run(true, true);
    }
  });

  apply(emptyView(), false);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    run();
  });
  document.addEventListener("orvupi-lang", function () {
    apply(last);
  });
  document.addEventListener("orvupi-verify-preview", function (event) {
    var detail = event.detail || {};
    if (detail.kind === "comprobando") apply(pendingView(detail.raw || ""));
    if (detail.kind === "lectura_caida") apply(classifyAddress(detail.raw || "So11111111111111111111111111111111111111112", cards, "caida"));
  });
}
