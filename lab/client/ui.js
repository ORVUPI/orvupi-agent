function findEntry(id) {
  var entries = STUBX_LAB.glossary;
  for (var i = 0; i < entries.length; i += 1) {
    if (entries[i].id === id) return entries[i];
  }
  return null;
}

function textOf(value, lang) {
  if (!value) return lang === "en" ? "unknown" : "desconocido";
  return value[lang] || value.es;
}

var STATUS_LABEL = {
  verificado: { es: "leído en la cadena", en: "read on-chain" },
  inferido: { es: "inferido", en: "inferred" },
  no_disponible: { es: "no disponible", en: "unavailable" },
  no_aplica: { es: "no aplica", en: "not applicable" },
  desconocido: { es: "desconocido", en: "unknown" },
};

var FIELD_LABEL = {
  name: { es: "Nombre on-chain", en: "On-chain name" },
  mint: { es: "Dirección del mint", en: "Mint address" },
  inRegistry: { es: "En el registro curado", en: "In the curated registry" },
  statement: { es: "Lectura de autenticidad", en: "Authenticity statement" },
  mintAuthority: { es: "Autoridad de emisión", en: "Mint authority" },
  freezeAuthority: { es: "Autoridad de congelación", en: "Freeze authority" },
  metadata: { es: "Metadatos", en: "Metadata" },
  holders: { es: "Muestra de cuentas con el token", en: "Token account sample" },
  impersonation: { es: "Señal de suplantación", en: "Impersonation signal" },
  curvePresent: { es: "Cuenta de curva", en: "Curve account" },
  curveProgress: { es: "Avance de la curva clásica", en: "Classic curve progress" },
};

var META_LABEL = {
  no_mutables_en_fuentes: { es: "No mutables en las fuentes leídas", en: "Not mutable in the sources read" },
  mutables: { es: "Mutables", en: "Mutable" },
  desconocido: { es: "Desconocido", en: "Unknown" },
};

function statusLabel(status, lang) {
  return textOf(STATUS_LABEL[status] || STATUS_LABEL.desconocido, lang);
}

function factText(status, value, lang) {
  if (status !== "verificado" && status !== "inferido") return statusLabel(status, lang);
  if (!value) return statusLabel(status, lang);
  return value + " · " + statusLabel(status, lang);
}

function yesNo(value, lang) {
  if (lang === "en") return value ? "yes" : "no";
  return value ? "sí" : "no";
}

function authorityWord(state, lang) {
  if (lang !== "en") return state;
  if (state === "revocada") return "revoked";
  if (state === "activa") return "active";
  return state;
}

function noteFor(card, key, lang) {
  if (lang === "en" && card[key + "_en"]) return card[key + "_en"];
  return card[key];
}

function fieldText(card, key, lang) {
  if (key === "name") return { value: factText(card.nameStatus, card.name, lang), note: null };
  if (key === "mint") return { value: card.mint, note: null };
  if (key === "inRegistry") {
    var registry = card.inRegistry === null ? null : yesNo(card.inRegistry, lang);
    return { value: factText(card.inRegistryStatus, registry, lang), note: null };
  }
  if (key === "statement") {
    var statement = lang === "en" && card.statement_en ? card.statement_en : card.statement;
    return { value: factText(card.statementStatus, statement, lang), note: null };
  }
  if (key === "mintAuthority") return { value: factText(card.mintAuthority.status, authorityWord(card.mintAuthority.state, lang), lang), note: null };
  if (key === "freezeAuthority") return { value: factText(card.freezeAuthority.status, authorityWord(card.freezeAuthority.state, lang), lang), note: null };
  if (key === "metadata") return { value: textOf(META_LABEL[card.metadataReading], lang), note: null };
  if (key === "holders") return { value: factText(card.holdersStatus, null, lang), note: noteFor(card, "holdersNote", lang) };
  if (key === "impersonation") {
    if (card.impersonation === null) return { value: statusLabel("desconocido", lang), note: null };
    var level = levelWord(card.authenticityLevel, lang);
    if (card.impersonation) {
      var copyLabel = lang === "en" ? "Possible impersonation" : "Posible suplantación";
      return { value: copyLabel + (level ? " · " + level : ""), note: null };
    }
    if (card.inRegistry === true) {
      var registryLabel = lang === "en" ? "In the registry" : "En el registro";
      return { value: registryLabel + (level ? " · " + level : ""), note: null };
    }
    return { value: lang === "en" ? "No such signal" : "Sin esa señal", note: null };
  }
  if (key === "curvePresent") {
    var present = card.curvePresent === null ? null : yesNo(card.curvePresent, lang);
    return { value: factText(card.curvePresentStatus, present, lang), note: noteFor(card, "curveModuleNote", lang) };
  }
  if (key === "curveProgress") {
    var progress = card.curveProgress ? (lang === "en" ? card.curveProgress + "%" : card.curveProgress + " %") : null;
    return { value: factText(card.curveProgressStatus, progress, lang), note: noteFor(card, "curveProgressNote", lang) };
  }
  return { value: statusLabel("desconocido", lang), note: null };
}

function levelWord(level, lang) {
  if (level === "atención") return lang === "en" ? "attention" : "atención";
  if (level === "riesgo") return lang === "en" ? "risk" : "riesgo";
  if (level === "ok") return "ok";
  return level || "";
}

function el(tag, attrs) {
  var node = document.createElement(tag);
  if (!attrs) return node;
  Object.keys(attrs).forEach(function (key) {
    if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
  });
  return node;
}

var REGISTRY_MARK = {
  es: "(publicada en el registro oficial)",
  en: "(listed in the official registry)",
};

function fillLinked(node, text) {
  var marker = text.indexOf(REGISTRY_MARK.en) !== -1 ? REGISTRY_MARK.en : REGISTRY_MARK.es;
  if (text.indexOf(marker) === -1) {
    node.textContent = text;
    return;
  }
  node.replaceChildren();
  text.split(marker).forEach(function (chunk, index, chunks) {
    if (chunk) node.append(document.createTextNode(chunk));
    if (index < chunks.length - 1) {
      var anchor = el("a", { href: "/security/" });
      anchor.textContent = marker;
      node.append(anchor);
    }
  });
}

function entenderItems(mission) {
  var ids = mission.entender;
  if (!ids || !ids.length) return [];
  var catalog = STUBX_LAB.entender || [];
  var items = [];
  ids.forEach(function (id) {
    for (var i = 0; i < catalog.length; i += 1) {
      if (catalog[i].id === id) items.push(catalog[i]);
    }
  });
  return items;
}

function entenderGuide(item, lang) {
  var paragraph = el("p");
  paragraph.dataset.tema = item.id;
  paragraph.textContent = (item.explain && item.explain[lang]) || "";
  var guide = el("a", { href: item.href });
  guide.dataset.guia = item.href;
  guide.textContent = item[lang] || item.es;
  return { paragraph: paragraph, guide: guide };
}

function entenderNav(mission, lang) {
  var items = entenderItems(mission);
  if (!items.length) return null;
  var nav = el("nav", { class: "entender-resultado" });
  var titleText = lang === "en" ? "Understand this result" : "Entender este resultado";
  nav.setAttribute("aria-label", titleText);
  if (items.length === 1) {
    var only = entenderGuide(items[0], lang);
    var link = el("a", { class: "abrir-entender", href: items[0].href });
    link.textContent = titleText;
    nav.append(link, only.paragraph);
    return nav;
  }
  var panel = el("div", { class: "explicacion-resultado" });
  panel.hidden = true;
  panel.tabIndex = -1;
  items.forEach(function (item) {
    var parts = entenderGuide(item, lang);
    panel.append(parts.paragraph, parts.guide);
  });
  var button = el("button", { type: "button", class: "abrir-entender" });
  button.textContent = titleText;
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", function () {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    panel.focus();
  });
  nav.append(button, panel);
  return nav;
}

function bootLab() {
  var missionRoot = document.getElementById("mision-app");
  if (missionRoot && STUBX_LAB.mission) mountQuiz(missionRoot, STUBX_LAB.mission, STORAGE_KEY);
  var lessons = STUBX_LAB.lessons || [];
  for (var n = 0; n < lessons.length; n += 1) {
    var lesson = lessons[n];
    var node = document.querySelector('[data-leccion="' + lesson.id + '"]');
    if (node) mountQuiz(node, lesson, lessonStorageKey(lesson.id));
  }
}

function mountQuiz(root, mission, storageKey) {
  var lang = document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";
  var stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    stored = null;
  }
  var progress = parseProgress(stored, mission) || initialProgress(mission, lang);
  progress = withLang(progress, lang);
  var banner = null;
  var focusBanner = false;
  var focusStep = false;
  var saveError = false;
  var reviewId = null;

  function liveStep() {
    return currentStep(mission, progress);
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      saveError = false;
    } catch (error) {
      saveError = true;
    }
  }

  function openHelp(id) {
    var entry = findEntry(id);
    var dialog = document.getElementById("ayuda");
    var anchor = document.getElementById("termino-" + id);
    if (!entry || !dialog || typeof dialog.showModal !== "function") {
      if (anchor) anchor.scrollIntoView();
      return;
    }
    var title = document.getElementById("ayuda-titulo");
    var body = document.getElementById("ayuda-cuerpo");
    var closeBtn = document.getElementById("ayuda-cerrar");
    if (!title || !body) return;
    title.textContent = entry.term[lang];
    body.replaceChildren();
    ["means", "example", "doesNotConclude"].forEach(function (key) {
      var paragraph = el("p");
      paragraph.textContent = entry[key][lang];
      body.append(paragraph);
    });
    var stay = el("p");
    stay.textContent = lang === "en"
      ? "Opening help does not change local progress."
      : "Abrir la ayuda no cambia el progreso local.";
    body.append(stay);
    var more = el("p");
    var link = el("a", { href: "/aprender/?from=lab#" + id });
    link.textContent = lang === "en"
      ? "Open this term in the library. Lab progress stays in this browser."
      : "Abrir este término en la biblioteca. El progreso de Lab se queda en este navegador.";
    more.append(link);
    body.append(more);
    if (closeBtn) closeBtn.textContent = lang === "en" ? "Close" : "Cerrar";
    dialog.returnFocus = document.activeElement;
    dialog.showModal();
  }

  var dialogNode = document.getElementById("ayuda");
  if (dialogNode) {
    dialogNode.addEventListener("close", function () {
      var back = dialogNode.returnFocus;
      if (back && back.focus) back.focus();
    });
  }

  function cardNode(card, fields) {
    var article = el("article", { class: "ficha" });
    var heading = el("h3");
    heading.textContent = card.name || card.mint;
    var role = el("p", { class: "rol" });
    role.textContent = card.roleNote[lang];
    var mint = el("p");
    var code = el("code", { class: "mint" });
    code.textContent = card.mint;
    mint.append(code);
    var list = el("dl");
    fields.forEach(function (key) {
      var item = fieldText(card, key, lang);
      var term = el("dt");
      term.textContent = textOf(FIELD_LABEL[key], lang);
      var detail = el("dd");
      detail.textContent = item.value;
      if (item.note) {
        var note = el("p", { class: "muted" });
        note.textContent = item.note;
        detail.append(note);
      }
      list.append(term, detail);
    });
    article.append(heading, role, mint, list);
    return article;
  }

  function helpButtons(step) {
    if (!step.glossary.length) return null;
    var wrap = el("div", { class: "glosario-paso" });
    step.glossary.forEach(function (id) {
      var entry = findEntry(id);
      if (!entry) return;
      var button = el("button", { type: "button", class: "secondary" });
      button.textContent = lang === "en"
        ? "What does “" + entry.term[lang] + "” mean?"
        : "¿Qué significa «" + entry.term[lang] + "»?";
      button.addEventListener("click", function () { openHelp(id); });
      wrap.append(button);
    });
    return wrap;
  }

  function restartButton() {
    var button = el("button", { type: "button", class: "primary" });
    button.textContent = lang === "en" ? "Start again" : "Empezar de nuevo";
    button.addEventListener("click", function () {
      progress = resetProgress(mission, lang);
      banner = null;
      reviewId = null;
      focusStep = true;
      save();
      render();
    });
    return button;
  }

  function coverHeight() {
    var header = document.querySelector("header.site");
    if (!header) return 0;
    var pos = window.getComputedStyle(header).position;
    if (pos !== "fixed" && pos !== "sticky") return 0;
    return Math.ceil(header.getBoundingClientRect().height);
  }

  function resetButton() {
    var button = el("button", { type: "button", class: "secondary" });
    button.textContent = lang === "en" ? "Delete local progress" : "Borrar progreso local";
    button.addEventListener("click", function () {
      var question = mission.id.indexOf("leccion-") === 0
        ? (lang === "en"
          ? "Delete the local progress of this lesson in this browser?"
          : "¿Borrar el progreso local de esta lección en este navegador?")
        : (lang === "en"
          ? "Delete the local progress of this mission in this browser?"
          : "¿Borrar el progreso local de esta misión en este navegador?");
      if (!window.confirm(question)) return;
      progress = resetProgress(mission, lang);
      banner = null;
      reviewId = null;
      save();
      render();
    });
    return button;
  }

  function render() {
    root.replaceChildren();
    var understand = entenderNav(mission, lang);
    if (understand) root.append(understand);
    var total = mission.steps.length;
    var nav = el("ol", { class: "pasos" });
    mission.steps.forEach(function (step, index) {
      var item = el("li");
      var button = el("button", { type: "button", class: "secondary" });
      var solved = progress.solved.indexOf(step.id) !== -1;
      var active = liveStep();
      var isLive = Boolean(active && active.id === step.id);
      var showing = reviewId ? reviewId === step.id : isLive;
      var label = String(index + 1);
      button.textContent = label;
      if (!solved && !isLive) button.disabled = true;
      if (showing) button.setAttribute("aria-current", "step");
      button.addEventListener("click", function () {
        reviewId = solved && !isLive ? step.id : null;
        banner = null;
        render();
      });
      item.append(button);
      nav.append(item);
    });
    if (progress.completed) {
      var resultButton = el("button", { type: "button" });
      resultButton.textContent = lang === "en" ? "Result" : "Resultado";
      if (reviewId === null) resultButton.setAttribute("aria-current", "step");
      resultButton.addEventListener("click", function () {
        reviewId = null;
        banner = null;
        render();
      });
      var resultItem = el("li");
      resultItem.append(resultButton);
      nav.append(resultItem);
    }
    root.append(nav);

    if (saveError) {
      var warn = el("p", { class: "nota" });
      warn.textContent = lang === "en"
        ? "This browser did not store the progress. It will disappear when the page closes."
        : "Este navegador no guardó el progreso. Se pierde al cerrar la página.";
      root.append(warn);
    }

    if (banner) {
      var feedback = el("div", { class: banner.correct ? "feedback encaja" : "feedback no-encaja", role: "status", tabindex: "-1" });
      var feedbackTitle = el("h2");
      feedbackTitle.textContent = banner.correct
        ? (lang === "en" ? "That answer fits" : "Esa respuesta encaja")
        : (lang === "en" ? "That answer does not fit" : "Esa respuesta no encaja");
      var feedbackBody = el("p");
      fillLinked(feedbackBody, banner.explanation[lang]);
      var again = el("p");
      again.textContent = banner.correct
        ? (lang === "en" ? "When you have read it, press Next step. There is no score and no penalty." : "Cuando lo hayas leído, pulsa Siguiente paso. No hay puntuación ni penalización.")
        : (lang === "en" ? "You can choose another answer. There is no penalty." : "Puedes elegir otra respuesta. No hay penalización.");
      feedback.append(feedbackTitle, feedbackBody, again);
      if (banner.correct) {
        var next = el("button", { type: "button", class: "primary siguiente" });
        next.textContent = lang === "en" ? "Next step" : "Siguiente paso";
        next.addEventListener("click", function () {
          reviewId = null;
          banner = null;
          focusStep = true;
          render();
        });
        feedback.append(next);
      }
      root.append(feedback);
    }

    var showingResult = progress.completed && reviewId === null;
    if (showingResult) {
      var done = el("section");
      var doneTitle = el("h2");
      doneTitle.textContent = lang === "en" ? "Result" : "Resultado";
      done.append(doneTitle);
      mission.steps.forEach(function (step, index) {
        var block = el("article", { class: "ficha" });
        var name = el("h3");
        name.textContent = (step.kind === "check" ? (index + 1) + ". " : "") + step.prompt[lang];
        var line = el("p");
        fillLinked(line, step.whyRight[lang]);
        block.append(name, line);
        done.append(block);
      });
      var close = el("p");
      fillLinked(close, mission.closing[lang]);
      var dated = el("p");
      var cardDate = mission.cardDate || STUBX_LAB.cardDate;
      dated.textContent = lang === "en"
        ? "The cards are from " + cardDate + ". Unknown is not the same as checked."
        : "Las fichas son del " + cardDate + ". Lo desconocido no es lo mismo que lo comprobado.";
      done.setAttribute("data-live-step", "resultado");
      done.append(close, dated, restartButton(), resetButton());
      root.append(done);
    } else {
      var stepId = reviewId || (liveStep() ? liveStep().id : mission.steps[0].id);
      var step = null;
      for (var i = 0; i < mission.steps.length; i += 1) {
        if (mission.steps[i].id === stepId) step = mission.steps[i];
      }
      if (!step) return;
      var section = el("section", { "data-live-step": step.id });
      var heading = el("h2");
      var position = mission.steps.indexOf(step);
      heading.textContent = lang === "en"
        ? "Step " + (position + 1) + " of " + total
        : "Paso " + (position + 1) + " de " + total;
      var guide = el("p", { class: "apoyo" });
      guide.textContent = step.guide[lang];
      section.append(heading, guide);
      var words = helpButtons(step);
      if (words) section.append(words);
      if (step.cards.length > 0) {
        var fold = el("details", { class: "tecnico" });
        var summary = el("summary");
        summary.textContent = lang === "en" ? "Details" : "Detalles";
        fold.append(summary);
        step.cards.forEach(function (mint) {
          var card = STUBX_LAB.cards[mint];
          if (card) fold.append(cardNode(card, step.fields));
        });
        section.append(fold);
      }
      var prompt = el("h3");
      prompt.textContent = step.prompt[lang];
      section.append(prompt);
      var solved = progress.solved.indexOf(step.id) !== -1;
      var waiting = Boolean(banner && banner.correct && banner.stepId === step.id);
      if (solved && !waiting) {
        var lesson = el("p");
        fillLinked(lesson, step.whyRight[lang]);
        var locked = el("p", { class: "muted" });
        locked.textContent = lang === "en"
          ? "This check is already done. To try it again, delete the local progress."
          : "Esta comprobación ya está hecha. Para repetirla, borra el progreso local.";
        section.append(lesson, locked);
      } else if (!solved) {
        var options = el("div", { class: "opciones", role: "group" });
        var questionId = "pregunta-" + mission.id;
        options.setAttribute("aria-labelledby", questionId);
        prompt.id = questionId;
        step.options.forEach(function (option) {
          var button = el("button", { type: "button" });
          button.textContent = option.label[lang];
          button.addEventListener("click", function () {
            var grade = answer(mission, progress, step.id, option.id);
            if (!grade.applied) return;
            progress = grade.progress;
            banner = { correct: grade.correct, explanation: grade.explanation, stepId: step.id };
            focusBanner = true;
            if (grade.correct) reviewId = step.id;
            save();
            render();
          });
          options.append(button);
        });
        section.append(options);
      }
      section.append(resetButton());
      root.append(section);
    }

    if (focusBanner) {
      var region = root.querySelector(".feedback");
      if (region) {
        region.style.scrollMarginTop = coverHeight() + "px";
        region.scrollIntoView({ block: "start" });
        region.focus({ preventScroll: true });
      }
      focusBanner = false;
    }
    if (focusStep) {
      var live = root.querySelector("[data-live-step]");
      if (live) {
        live.style.scrollMarginTop = coverHeight() + "px";
        live.scrollIntoView({ block: "start" });
        var heading = live.querySelector("h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
      focusStep = false;
    }
  }

  document.addEventListener("stubx-lang", function (event) {
    lang = event.detail === "en" ? "en" : "es";
    progress = withLang(progress, lang);
    save();
    render();
  });

  save();
  render();
}
