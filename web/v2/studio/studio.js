import catalog from "./catalog.json" with { type: "json" };
import templates from "./templates.json" with { type: "json" };
import { PNG_COMMENT } from "./lib/copy.mjs";
import { HEADLINES, headlineById } from "./lib/headlines.mjs";
import { clearDraft, clipDraftText, loadDraft, saveDraft } from "./lib/draft.mjs";
import { analyze, exportAllowed } from "./lib/filter.mjs";
import { DEFAULT_TOKEN, LOGO_MAX_BYTES, TOKEN_MAX, avatarKey, clipToken, createLogoGate, isStubxToken, mascotCacheMark, mayCacheCard, readLogoPng, stampImage } from "./lib/logo.mjs";
import { decodePng, injectComment } from "./lib/png.mjs";
import { renderCard } from "./lib/render.mjs";
import { FILE_NAME, REVOKE_MS, canShareFiles, isIOS, saveMode } from "./lib/save.mjs";

const titleInput = document.getElementById("titulo");
const bodyInput = document.getElementById("cuerpo");
const tokenInput = document.getElementById("token");
const canvas = document.getElementById("vista");
const download = document.getElementById("descargar");
const share = document.getElementById("compartir");
const clearButton = document.getElementById("borrar");
const saveNotice = document.getElementById("aviso-guardar");
const ios = isIOS(navigator);
const shareProbe = new File([new Uint8Array(8)], FILE_NAME, { type: "image/png" });
const shareFiles = canShareFiles(navigator, shareProbe);
share.hidden = !shareFiles;
let ready = null;
let readyFor = 0;
let drawCount = 0;
const blockNotice = document.getElementById("aviso-bloqueo");
const fitNotice = document.getElementById("aviso-cabe");
const detail = document.getElementById("aviso-detalle");
const loadNotice = document.getElementById("aviso-carga");
const titleCount = document.getElementById("contador-titulo");
const bodyCount = document.getElementById("contador-cuerpo");
const tokenCount = document.getElementById("contador-token");
const logoInput = document.getElementById("logo");
const logoClear = document.getElementById("quitar-logo");
const logoNotice = document.getElementById("aviso-logo");
const logoFormatNotice = document.getElementById("aviso-logo-formato");
const logoWeightNotice = document.getElementById("aviso-logo-peso");
const logoSizeNotice = document.getElementById("aviso-logo-medida");
const logoScaleNotice = document.getElementById("aviso-logo-reducir");
const mascotNotice = document.getElementById("aviso-mascota");
const logoState = document.getElementById("logo-estado");
const userLive = document.getElementById("vista-usuario");
const bgBox = document.getElementById("opcion-fondo");
const typeBox = document.getElementById("opcion-titular");
const avatarBox = document.getElementById("avatares");

const backgrounds = catalog.items.filter((item) => item.tipo === "fondo" && item.permitido);
const avatars = catalog.items.filter((item) => item.tipo === "avatar" && item.permitido);
const images = new Map();
let templateId = "aprendizaje";
let formatId = "square";
let backgroundId = backgrounds[0]?.id ?? "";
let headlineId = "meme";
let avatarId = avatars[0]?.id ?? "";
let customLogo = null;
const logoGate = createLogoGate();
let dirty = false;
let timer = 0;
let latest = null;

function lang() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function template() {
  return templates.templates.find((item) => item.id === templateId) ?? templates.templates[0];
}

function format() {
  return templates.formats.find((item) => item.id === formatId) ?? templates.formats[0];
}

function background() {
  return backgrounds.find((item) => item.id === backgroundId) ?? backgrounds[0];
}

function avatarItem() {
  return avatars.find((item) => item.id === avatarId) ?? null;
}

function limits() {
  return template().limits ?? templates.limits;
}

function applyTemplate(id, code, keepText) {
  templateId = id;
  const item = template();
  const max = limits();
  titleInput.maxLength = max.title;
  bodyInput.maxLength = max.body;
  if (!keepText) {
    titleInput.value = item.title[code];
    bodyInput.value = item.body[code];
    dirty = false;
  }
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.setAttribute("aria-pressed", button.getAttribute("data-template") === id ? "true" : "false");
  });
}

function choiceButton(pressed, label, thumb) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  if (thumb) {
    const img = document.createElement("img");
    img.src = thumb.src;
    img.alt = "";
    img.width = thumb.width;
    img.height = thumb.height;
    img.decoding = "async";
    button.append(img);
  }
  const name = document.createElement("span");
  name.textContent = label;
  button.append(name);
  return button;
}

function paintChoices() {
  const code = lang();
  bgBox.replaceChildren();
  for (const item of backgrounds) {
    const button = choiceButton(item.id === backgroundId, item.nombre[code], {
      src: item.miniatura || item.archivo,
      width: 96,
      height: 54,
    });
    button.addEventListener("click", () => {
      backgroundId = item.id;
      paintChoices();
      schedule("change");
    });
    bgBox.append(button);
  }
  if (typeBox) {
    typeBox.replaceChildren();
    for (const item of HEADLINES) {
      const button = choiceButton(item.id === headlineId, item.nombre[code]);
      button.style.fontFamily = `"${item.family}", sans-serif`;
      button.addEventListener("click", () => {
        headlineId = item.id;
        paintChoices();
        schedule("change");
      });
      typeBox.append(button);
    }
  }
  avatarBox.replaceChildren();
  const stubxName = isStubxToken(tokenName());
  mascotNotice.hidden = stubxName;
  if (customLogo) {
    const own = document.createElement("button");
    own.type = "button";
    own.textContent = code === "en" ? "Your logo" : "Tu logo";
    own.setAttribute("aria-pressed", "true");
    avatarBox.append(own);
  }
  if (stubxName) {
    const none = document.createElement("button");
    none.type = "button";
    none.textContent = code === "en" ? "No character" : "Sin personaje";
    none.setAttribute("aria-pressed", !customLogo && !avatarId ? "true" : "false");
    none.addEventListener("click", () => {
      avatarId = "";
      customLogo = null;
      logoInput.value = "";
      paintChoices();
      schedule();
    });
    avatarBox.append(none);
    for (const item of avatars) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.nombre[code];
      button.setAttribute("aria-pressed", !customLogo && item.id === avatarId ? "true" : "false");
      button.addEventListener("click", () => {
        avatarId = item.id;
        customLogo = null;
        logoInput.value = "";
        paintChoices();
        schedule();
      });
      avatarBox.append(button);
    }
  }
  logoState.textContent = customLogo ? (code === "en" ? "Logo ready in this browser." : "Logo listo en este navegador.") : "";
}

function hitLabel(hit, code) {
  if (hit.kind === "base58") return code === "en" ? "address" : "dirección";
  if (hit.kind === "url") return code === "en" ? "link" : "enlace";
  if (hit.kind === "handle") return hit.term;
  return hit.term;
}

function tokenName() {
  return clipToken(tokenInput.value);
}

const PREVIEW_CAP = 1600;
const TYPE_IDLE_MS = 180;
const carga = document.getElementById("vista-carga");
const prepNotice = document.getElementById("aviso-preparando");
const prepared = new Map();
const previewCache = new Map();
const exportJobs = new Map();
let renderToken = 0;
let raf = 0;
let fontWarm = null;
let exportTimer = 0;
let jobId = 0;
let worker = null;
let workerBroken = false;
let avatarCacheKey = "";
let previewJob = 0;
let previewWait = null;
let exportJobId = 0;
let exportCount = 0;

function warmFonts() {
  if (fontWarm) return fontWarm;
  const families = ["Inter Studio", "Silkscreen Studio", "Studio Anton", "Studio Bangers", "Studio Audiowide", "Studio Pixel", "Studio Archivo"];
  if (!document.fonts?.load) {
    fontWarm = Promise.resolve();
    return fontWarm;
  }
  fontWarm = Promise.all(families.map((family) => document.fonts.load(`16px "${family}"`))).then(() => {}).catch(() => {});
  return fontWarm;
}

function previewSize() {
  const full = format();
  const cssW = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 320);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  let width = cssW * dpr;
  let height = width * (full.height / full.width);
  const long = Math.max(width, height);
  if (long > PREVIEW_CAP) {
    const scale = PREVIEW_CAP / long;
    width *= scale;
    height *= scale;
  }
  width = Math.max(1, Math.min(full.width, Math.round(width)));
  height = Math.max(1, Math.min(full.height, Math.round(width * full.height / full.width)));
  if (height > full.height) {
    height = full.height;
    width = Math.max(1, Math.min(full.width, Math.round(height * full.width / full.height)));
  }
  if (full.width === full.height) height = width;
  return { width, height };
}

function mascotMark() {
  const stubx = isStubxToken(tokenName());
  const id = customLogo || !stubx ? "" : (avatarId || "");
  return mascotCacheMark({
    customLogo: Boolean(customLogo),
    stubx,
    avatarId: id,
    loaded: Boolean(id && images.has(id)),
  });
}

function contentKey(width, height) {
  const bg = background();
  const name = tokenName();
  const logo = customLogo ? avatarKey(customLogo) : "";
  const avatar = !customLogo && isStubxToken(name) ? (avatarId || "") : "";
  return [
    width,
    height,
    lang(),
    titleInput.value,
    bodyInput.value,
    name,
    bg?.id ?? "",
    bg?.fill ?? "",
    bg?.ink ?? "",
    headlineById(headlineId).id,
    avatar,
    mascotMark(),
    logo,
  ].join("\u001f");
}

function exportStateKey() {
  const size = format();
  return contentKey(size.width, size.height);
}

function previewStateKey() {
  const size = previewSize();
  return contentKey(size.width, size.height);
}

function recall(map, key) {
  if (!map.has(key)) return null;
  const value = map.get(key);
  map.delete(key);
  map.set(key, value);
  return value;
}

function remember(map, key, value, limit) {
  map.delete(key);
  map.set(key, value);
  while (map.size > limit) map.delete(map.keys().next().value);
}

function workerOptions(size) {
  const options = cardOptions(size);
  const key = avatarKey(options.avatar);
  options.avatarKey = key;
  if (key && key === avatarCacheKey) delete options.avatar;
  else if (key) avatarCacheKey = key;
  return options;
}

function canUseWorker() {
  if (workerBroken || typeof Worker !== "function" || typeof OffscreenCanvas !== "function") return false;
  try {
    const probe = new OffscreenCanvas(1, 1);
    return Boolean(probe.getContext("2d") && probe.transferToImageBitmap);
  } catch {
    return false;
  }
}

function renderWorker() {
  if (!canUseWorker()) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./render.worker.mjs", import.meta.url), { type: "module" });
  } catch {
    workerBroken = true;
    worker = null;
    return null;
  }
  worker.onmessage = (event) => onWorkerMessage(event.data || {});
  worker.onerror = () => {
    workerBroken = true;
    const failed = worker;
    worker = null;
    avatarCacheKey = "";
    failed?.terminate();
    const wait = previewWait;
    const failedExport = exportJobId ? exportCount : 0;
    exportJobId = 0;
    if (failedExport) {
      exportedBlob(renderToken).then((blob) => {
        if (failedExport !== drawCount || !blob) {
          syncExportButtons();
          return;
        }
        ready = blob;
        readyFor = failedExport;
        syncExportButtons();
      }).catch((error) => {
        if (error?.name === "AbortError") return;
        loadNotice.hidden = false;
        download.disabled = true;
      });
    }
    if (!wait) return;
    previewWait = null;
    previewJob = 0;
    renderLocal(previewSize(), wait.token).then(wait.resolve, wait.reject);
  };
  return worker;
}

function cardOptions(size) {
  const code = lang();
  const bg = background();
  const name = tokenName();
  const stubxName = isStubxToken(name);
  const avatar = stubxName ? avatarItem() : null;
  const origins = customLogo || !avatar ? [bg?.aiOrigin].filter(Boolean) : [bg?.aiOrigin, avatar?.aiOrigin].filter(Boolean);
  return {
    width: size.width,
    height: size.height,
    lang: code,
    title: titleInput.value,
    body: bodyInput.value,
    token: name,
    fill: bg?.fill ?? "#0a090d",
    ink: bg?.ink ?? "#fff3f5",
    backgroundId: bg?.id,
    headline: headlineById(headlineId).id,
    origins,
    zones: templates.zones,
    avatar: customLogo ?? (avatar ? images.get(avatar.id) ?? null : null),
  };
}

function viewContext() {
  return canvas.getContext("2d", { willReadFrequently: true });
}

function showBitmap(bitmap, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = viewContext();
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
}

function paintStoredPreview(entry) {
  canvas.width = entry.width;
  canvas.height = entry.height;
  viewContext().putImageData(entry.data, 0, 0);
}

function paintCounters() {
  const max = limits();
  titleCount.textContent = `${titleInput.value.length} / ${max.title}`;
  bodyCount.textContent = `${bodyInput.value.length} / ${max.body}`;
  tokenCount.textContent = `${tokenName().length} / ${TOKEN_MAX}`;
}

function syncExportButtons() {
  const name = tokenName();
  const allowed = exportAllowed(titleInput.value, bodyInput.value, undefined, name);
  const fits = latest ? Boolean(latest.fits) : true;
  const waiting = !ready || readyFor !== drawCount;
  const showWait = waiting && allowed && fits;
  download.classList.toggle("preparando", showWait);
  share.classList.toggle("preparando", showWait);
  if (prepNotice) prepNotice.hidden = !showWait;
  download.disabled = !allowed || !fits || waiting || !latest;
  share.disabled = download.disabled;
}

function applyPreviewMeta(meta) {
  const code = lang();
  const name = tokenName();
  latest = {
    fits: Boolean(meta.fits),
    noticeText: meta.noticeText,
    label: meta.label || "",
    width: meta.width,
    height: meta.height,
  };
  const allowed = exportAllowed(titleInput.value, bodyInput.value, undefined, name);
  const hits = [...analyze(name).hits, ...analyze(titleInput.value).hits, ...analyze(bodyInput.value).hits];
  blockNotice.hidden = allowed;
  fitNotice.hidden = latest.fits;
  detail.textContent = hits.slice(0, 5).map((hit) => hitLabel(hit, code)).join(", ");
  const vistaTexto = document.getElementById("vista-texto");
  vistaTexto.replaceChildren();
  const noticeLabel = document.createElement("span");
  noticeLabel.lang = code;
  noticeLabel.textContent = meta.noticeText || "";
  vistaTexto.append(noticeLabel);
  userLive.textContent = [name, titleInput.value, bodyInput.value, meta.noticeText, meta.label].filter(Boolean).join(". ");
  syncExportButtons();
}

function finishChrome(token) {
  if (token !== renderToken || !carga) return;
  carga.hidden = true;
  canvas.removeAttribute("aria-busy");
}

function persist() {
  saveDraft(localStorage, {
    templateId,
    formatId,
    backgroundId,
    headlineId,
    avatarId,
    token: tokenName(),
    title: titleInput.value,
    body: bodyInput.value,
    dirty,
  });
}

async function draw(token) {
  return beginPreview(token);
}

function dropPreviewWait() {
  if (!previewWait) return;
  const wait = previewWait;
  previewWait = null;
  previewJob = 0;
  wait.resolve();
}

function storePreview(key, msg) {
  if (!key || !mayCacheCard(mascotMark())) return;
  const data = viewContext().getImageData(0, 0, msg.width, msg.height);
  remember(previewCache, key, {
    data,
    fits: Boolean(msg.fits),
    noticeText: msg.noticeText,
    label: msg.label || "",
    width: msg.width,
    height: msg.height,
  }, 6);
}

function storePrepared(key, msg) {
  if (!key || !msg.blob || !mayCacheCard(mascotMark())) return;
  remember(prepared, key, {
    blob: msg.blob,
    fits: msg.fits !== false,
    noticeText: msg.noticeText,
    label: msg.label || "",
    width: msg.width,
    height: msg.height,
  }, 8);
}

function onWorkerMessage(msg) {
  if (msg.kind === "preview") {
    if (!previewWait || msg.id !== previewWait.id) {
      msg.bitmap?.close?.();
      return;
    }
    const wait = previewWait;
    previewWait = null;
    previewJob = 0;
    if (msg.error) {
      workerBroken = true;
      worker?.terminate();
      worker = null;
      avatarCacheKey = "";
      renderLocal(previewSize(), wait.token).then(wait.resolve, wait.reject);
      return;
    }
    if (wait.token !== renderToken) {
      msg.bitmap?.close?.();
      wait.resolve();
      return;
    }
    showBitmap(msg.bitmap, msg.width, msg.height);
    storePreview(wait.key, msg);
    applyPreviewMeta(msg);
    finishChrome(wait.token);
    persist();
    placePreview();
    wait.resolve();
    return;
  }
  if (msg.kind !== "png") return;
  const job = exportJobs.get(msg.id);
  if (!job) return;
  exportJobs.delete(msg.id);
  if (msg.id === exportJobId) exportJobId = 0;
  if (msg.blob) storePrepared(job.key, msg);
  if (job.count !== drawCount) return;
  if (msg.fits === false || msg.error || !msg.blob) {
    if (msg.fits === false) {
      if (latest) latest.fits = false;
      syncExportButtons();
      return;
    }
    exportedBlob(renderToken).then((blob) => {
      if (job.count !== drawCount || !blob) {
        syncExportButtons();
        return;
      }
      ready = blob;
      readyFor = job.count;
      storePrepared(job.key, { blob, fits: true, noticeText: latest?.noticeText, label: latest?.label, width: format().width, height: format().height });
      syncExportButtons();
    }).catch((error) => {
      if (error?.name === "AbortError") return;
      loadNotice.hidden = false;
      download.disabled = true;
    });
    return;
  }
  if (latest) latest.fits = true;
  ready = msg.blob;
  readyFor = job.count;
  syncExportButtons();
}

async function paintBands(board, rgba, width, height, alive) {
  board.width = width;
  board.height = height;
  const ctx = board.getContext("2d");
  const pixels = rgba instanceof Uint8ClampedArray ? rgba : new Uint8ClampedArray(rgba);
  const band = 12;
  for (let y = 0; y < height; y += band) {
    if (alive && !alive()) return false;
    const h = Math.min(band, height - y);
    const slice = pixels.subarray(y * width * 4, (y + h) * width * 4);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(slice), width, h), 0, y);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return true;
}

async function renderLocal(size, token) {
  const card = await renderCard({
    ...cardOptions(size),
    preview: true,
    png: false,
    slice: true,
    cooperative: true,
    alive: () => token === renderToken,
  });
  if (token !== renderToken) return;
  const painted = await paintBands(canvas, card.rgba, card.width, card.height, () => token === renderToken);
  if (!painted || token !== renderToken) return;
  applyPreviewMeta(card);
  finishChrome(token);
  persist();
  placePreview();
}

async function beginPreview(token) {
  paintCounters();
  await warmFonts();
  if (token !== renderToken) return;
  const size = previewSize();
  const thread = renderWorker();
  if (thread) {
    const id = ++jobId;
    previewJob = id;
    await new Promise((resolve, reject) => {
    previewWait = { id, token, key: previewStateKey(), resolve, reject };
    thread.postMessage({ id, kind: "preview", options: workerOptions(size) });
    });
    return;
  }
  await renderLocal(size, token);
}

function placePreview() {
  const header = document.querySelector("header.site");
  const box = document.querySelector(".vista-caja");
  if (!header || !box) return;
  const narrow = window.matchMedia("(max-width: 800px)").matches;
  if (narrow) {
    header.classList.remove("sin-fijar");
    box.classList.remove("sin-fijar");
    document.documentElement.style.removeProperty("--cabecera");
    document.documentElement.style.scrollPaddingTop = "";
    return;
  }
  const bar = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--cabecera", `${bar}px`);
  const preview = box.getBoundingClientRect().height;
  const fits = bar + 4 + preview <= window.innerHeight - 8;
  header.classList.toggle("sin-fijar", !fits);
  box.classList.toggle("sin-fijar", !fits);
  document.documentElement.style.scrollPaddingTop = fits ? `${bar + 4 + preview + 12}px` : "0px";
}

function acceptPrepared(count, key) {
  const hit = recall(prepared, key);
  if (hit?.blob && hit.fits !== false) {
    ready = hit.blob;
    readyFor = count;
    if (latest) latest.fits = true;
    else latest = { fits: true, noticeText: hit.noticeText, label: hit.label || "", width: hit.width, height: hit.height };
    return true;
  }
  ready = null;
  readyFor = 0;
  if (hit?.fits === false) {
    if (latest) latest.fits = false;
    return true;
  }
  if (latest) latest.fits = true;
  return false;
}

// El blob se prepara en el worker y el toque solo lo usa si ya está listo.
function startExport(count, token, key) {
  if (count !== drawCount) return;
  if (!exportAllowed(titleInput.value, bodyInput.value, undefined, tokenName())) {
    syncExportButtons();
    return;
  }
  const thread = renderWorker();
  if (thread) {
    const id = ++jobId;
    exportJobId = id;
    exportCount = count;
    exportJobs.set(id, { count, key });
    while (exportJobs.size > 20) exportJobs.delete(exportJobs.keys().next().value);
    thread.postMessage({ id, kind: "png", options: workerOptions(format()) });
    return;
  }
  exportedBlob(token).then((blob) => {
    if (count !== drawCount || token !== renderToken || !blob) {
      syncExportButtons();
      return;
    }
    ready = blob;
    readyFor = count;
    storePrepared(key, { blob, fits: true, noticeText: latest?.noticeText, label: latest?.label, width: format().width, height: format().height });
    syncExportButtons();
  }).catch((error) => {
    if (error?.name === "AbortError") return;
    loadNotice.hidden = false;
    download.disabled = true;
  });
}

function postCancel() {
  const thread = worker;
  if (!thread) return;
  try {
    thread.postMessage({ kind: "cancel" });
  } catch {
    workerBroken = true;
    worker = null;
  }
}

function readyBlob() {
  if (ready && readyFor === drawCount) return ready;
  return null;
}

function releaseBlob(blob) {
  if (!blob) return null;
  if (!exportAllowed(titleInput.value, bodyInput.value, undefined, tokenName())) {
    ready = null;
    readyFor = 0;
    syncExportButtons();
    return null;
  }
  return blob;
}

function showSaveNotice() {
  saveNotice.hidden = false;
}

function openImage(blob) {
  const url = URL.createObjectURL(blob);
  // Con noopener window.open devuelve null; no se usa para decidir nada.
  window.open(url, "_blank", "noopener");
  showSaveNotice();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
}

function downloadFile(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "studio.png";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
}

function shareNow(blob) {
  const file = new File([blob], FILE_NAME, { type: "image/png" });
  navigator.share({ files: [file] }).then(() => {}, (error) => {
    if (error && error.name === "AbortError") return;
    openImage(blob);
  });
}

function schedule(kind) {
  clearTimeout(timer);
  clearTimeout(exportTimer);
  cancelAnimationFrame(raf);
  dropPreviewWait();
  const token = ++renderToken;
  drawCount += 1;
  const count = drawCount;
  const typing = kind === "input";
  exportJobId = 0;
  const key = exportStateKey();
  const known = acceptPrepared(count, key);
  syncExportButtons();
  postCancel();
  const previewHit = recall(previewCache, previewStateKey());
  if (!typing && carga) {
    canvas.setAttribute("aria-busy", "true");
    carga.hidden = false;
  }
  const runPreview = () => {
    if (token !== renderToken) return;
    const stored = previewHit || recall(previewCache, previewStateKey());
    if (stored) {
      paintStoredPreview(stored);
      applyPreviewMeta(stored);
      finishChrome(token);
      persist();
      placePreview();
      return;
    }
    const slow = setTimeout(() => {
      if (token === renderToken && carga) {
        canvas.setAttribute("aria-busy", "true");
        carga.hidden = false;
      }
    }, 100);
    draw(token).catch((error) => {
      if (error?.name === "AbortError") return;
      if (token !== renderToken) return;
      loadNotice.hidden = false;
      download.disabled = true;
    }).finally(() => {
      clearTimeout(slow);
      finishChrome(token);
    });
  };
  const runExport = () => {
    if (known || count !== drawCount) return;
    startExport(count, token, key);
  };
  if (typing) {
    exportTimer = setTimeout(() => {
      if (token !== renderToken) return;
      runExport();
      raf = requestAnimationFrame(runPreview);
    }, TYPE_IDLE_MS);
    return;
  }
  runExport();
  raf = requestAnimationFrame(runPreview);
}

async function loadImages() {
  await Promise.all(avatars.map(async (item) => {
    const response = await fetch(item.archivo);
    if (!response.ok) throw new Error(item.id);
    images.set(item.id, stampImage(await decodePng(new Uint8Array(await response.arrayBuffer()))));
  }));
}

async function blobFrom(canvas, rgba, width, height, alive) {
  const painted = await paintBands(canvas, rgba, width, height, alive);
  if (!painted) return null;
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function exportedBlob(token) {
  if (!exportAllowed(titleInput.value, bodyInput.value, undefined, tokenName())) return null;
  const full = format();
  const card = await renderCard({
    ...cardOptions(full),
    png: false,
    cooperative: true,
    slice: true,
    alive: () => token === renderToken,
  });
  if (!card?.fits || token !== renderToken) return null;
  const board = document.createElement("canvas");
  const blob = await blobFrom(board, card.rgba, card.width, card.height, () => token === renderToken);
  if (!blob || token !== renderToken) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Blob([injectComment(bytes, PNG_COMMENT)], { type: "image/png" });
}

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => {
    applyTemplate(button.getAttribute("data-template"), lang(), false);
    schedule();
  });
});
document.querySelectorAll("[data-format]").forEach((button) => {
  button.addEventListener("click", () => {
    formatId = button.getAttribute("data-format");
    document.querySelectorAll("[data-format]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    schedule();
  });
});
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.getAttribute("data-tab");
    document.querySelectorAll("[data-tab]").forEach((item) => {
      const on = item === button;
      item.setAttribute("aria-selected", on ? "true" : "false");
      item.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-panel") !== name;
    });
  });
});
titleInput.addEventListener("input", () => {
  dirty = true;
  schedule("input");
});
bodyInput.addEventListener("input", () => {
  dirty = true;
  schedule("input");
});
tokenInput.maxLength = TOKEN_MAX;
tokenInput.addEventListener("input", () => {
  paintChoices();
  schedule("input");
});
function hideLogoErrors() {
  logoNotice.hidden = true;
  logoFormatNotice.hidden = true;
  logoWeightNotice.hidden = true;
  logoSizeNotice.hidden = true;
  logoScaleNotice.hidden = true;
}

function showLogoError(message) {
  hideLogoErrors();
  if (message === "logo-bytes") logoWeightNotice.hidden = false;
  else if (message === "logo-size") logoSizeNotice.hidden = false;
  else if (message === "logo-scale") logoScaleNotice.hidden = false;
  else if (message === "logo-format") logoFormatNotice.hidden = false;
  else logoNotice.hidden = false;
}

function readBlob(blob, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal?.aborted) {
      abort();
      return;
    }
    const onAbort = () => abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    blob.arrayBuffer().then(
      (buffer) => {
        signal?.removeEventListener("abort", onAbort);
        if (signal?.aborted) abort();
        else resolve(buffer);
      },
      (error) => {
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

logoInput.addEventListener("change", () => {
  const file = logoInput.files?.[0];
  if (!file) return;
  if (file.size > LOGO_MAX_BYTES) {
    logoGate.cancel();
    customLogo = null;
    logoInput.value = "";
    showLogoError("logo-bytes");
    paintChoices();
    schedule();
    return;
  }
  const load = logoGate.begin();
  readBlob(file, load.signal).then((buffer) => readLogoPng(new Uint8Array(buffer))).then((image) => {
    if (!load.stillCurrent()) return;
    customLogo = stampImage(image);
    hideLogoErrors();
    paintChoices();
    schedule();
  }).catch((error) => {
    if (!load.stillCurrent() || error?.name === "AbortError") return;
    customLogo = null;
    logoInput.value = "";
    showLogoError(error?.message);
    paintChoices();
    schedule();
  });
});
logoClear.addEventListener("click", () => {
  logoGate.cancel();
  customLogo = null;
  logoInput.value = "";
  hideLogoErrors();
  paintChoices();
  schedule();
});
download.addEventListener("click", () => {
  const blob = releaseBlob(readyBlob());
  if (!blob) return;
  const mode = saveMode({ ios, share: shareFiles });
  if (mode === "share") {
    shareNow(blob);
    return;
  }
  if (mode === "open") {
    openImage(blob);
    return;
  }
  downloadFile(blob);
});
share.addEventListener("click", () => {
  const blob = releaseBlob(readyBlob());
  if (!blob || !shareFiles) return;
  shareNow(blob);
});
clearButton.addEventListener("click", () => {
  clearDraft(localStorage);
  dirty = false;
  customLogo = null;
  logoGate.cancel();
  logoInput.value = "";
  hideLogoErrors();
  tokenInput.value = DEFAULT_TOKEN;
  applyTemplate(templateId, lang(), false);
  paintChoices();
  schedule();
});
document.addEventListener("stubx-lang", () => {
  if (!dirty) applyTemplate(templateId, lang(), false);
  paintChoices();
  schedule();
});

if (navigator.share) share.hidden = false;
const saved = loadDraft(localStorage);
if (saved) {
  templateId = saved.templateId || templateId;
  formatId = saved.formatId || formatId;
  backgroundId = saved.backgroundId || backgroundId;
  if (saved.headlineId && headlineById(saved.headlineId).id === saved.headlineId) headlineId = saved.headlineId;
  avatarId = saved.avatarId || "";
  dirty = Boolean(saved.dirty);
  applyTemplate(templateId, lang(), true);
  const max = limits();
  titleInput.value = clipDraftText(saved.title ?? titleInput.value, max.title);
  bodyInput.value = clipDraftText(saved.body ?? bodyInput.value, max.body);
  tokenInput.value = clipToken(saved.token === undefined ? DEFAULT_TOKEN : saved.token);
  document.querySelectorAll("[data-format]").forEach((button) => {
    button.setAttribute("aria-pressed", button.getAttribute("data-format") === formatId ? "true" : "false");
  });
} else {
  applyTemplate(templateId, lang(), lang() === "es");
}
paintChoices();
placePreview();
window.addEventListener("resize", placePreview);
document.fonts?.ready?.then(placePreview);
loadImages().then(schedule).catch(() => {
  loadNotice.hidden = false;
  schedule();
});
