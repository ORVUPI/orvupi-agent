import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FileRecord, StorageService } from "../storage/types";
import { formatBytes } from "../security/names";
import { aiEngine, blocksFurtherDownloads, bootCandidates, detectAiSupport, isModelCached, modelChain, readDeviceMemory, rememberModel, usableModels, type AiModel, type AiSupport, type ChatMessage } from "./engine";
import { buildMessages, CHUNK_CHARS, MAX_PARTS } from "./prompts";
import { hybridAnalyze, hybridAsk, hybridExplain, hybridGenerate, hybridOutline, hybridQuestions, hybridSummary, paragraphChunks, parseRequest, rewriteMessages, rewriteOk, translationOk, type Generate, type HybridResult, type Intent } from "./hybrid";
import { aiFiles, textOfFile } from "./sources";
import { cleanInput, cleanOutput } from "./clean";
import { markdownToDoc, markdownToPlain, parseMarkdown, type MdBlock, type Span } from "./markdown";
import { createOrvdoc, serializeOrvdoc } from "../docs/orvdoc";
import { createId } from "../security/names";
import { downloadBytes } from "../security/bytes";
import { openEditorWindow, editorPath } from "../routing/paths";
import { publishFilesChanged } from "../routing/sync";
import { buildWorkRequest } from "./contract";
import { coreEnabled, runWorkGenerate } from "./client";

export type AiTask = Intent["action"];
export type InsertMode = "insert" | "replace" | "below";

const ES = {
  title: "ORVUPI AI",
  privacy: "Funciona dentro de tu navegador. Tus documentos no salen del dispositivo: solo se descarga el modelo la primera vez y queda guardado. Los modelos son de terceros (Qwen, LFM2, SmolLM2) y no se llaman Arqiven-N.",
  model: "1. Preparar la IA",
  checking: "Comprobando qué puede ejecutar este dispositivo…",
  none: "Este navegador no puede ejecutar la IA local. Prueba con Chrome, Edge, Firefox o Safari recientes.",
  modelGpuSmall: "Qwen2.5 0.5B",
  modelGpuLarge: "Qwen2.5 1.5B · más preciso",
  modelCpu: "Qwen2.5 0.5B · compatible",
  modelCpuLarge: "Qwen2.5 1.5B · más preciso, en equipos con 8 GB o más",
  modelTiny: "SmolLM2 135M · tercero",
  modelLfm: "LFM2 350M · tercero",
  prepare: "Preparar ORVUPI AI ({size}, solo la primera vez)",
  prepareCached: "Preparar ORVUPI AI",
  ready: "IA lista en este dispositivo",
  readyDetail: "Ya puedes resumir, explicar o crear un documento.",
  loading: "Preparando IA: descargando {pct} % ({done} de {total}). Puedes seguir usando Work.",
  compiling: "Preparando IA: comprobando que funciona en este dispositivo…",
  trying: "Preparando IA: probando otra opción compatible con este dispositivo…",
  allFailed: "No hemos podido poner en marcha la IA en este dispositivo ahora mismo. Comprueba la conexión (la primera vez se descarga el modelo) y vuelve a intentarlo en un rato; mientras tanto, «Analizar» funciona sin descargar nada.",
  offline: "Sin conexión: la IA se descarga la primera vez. Lo descargado queda guardado y continuará donde se quedó al volver la conexión.",
  quota: "No hay espacio en el navegador para guardar la IA. Libera espacio y vuelve a intentarlo.",
  advanced: "Opciones avanzadas",
  advancedHelp: "ORVUPI AI elige sola el modo que funciona en este dispositivo y recuerda lo que funcionó. No hace falta cambiar nada.",
  pickModel: "Modelo",
  useModel: "Usar este modelo",
  recommended: "recomendado",
  cached: "descargado",
  free: "Liberar memoria",
  freed: "Memoria liberada (el modelo sigue descargado).",
  source: "2. Qué texto usar",
  srcOpen: "Documento abierto",
  srcSelection: "Texto seleccionado",
  srcFile: "Otro archivo de Work",
  srcPaste: "Pegar texto",
  pickFile: "Archivo",
  noFiles: "No hay documentos, hojas, presentaciones ni notas todavía.",
  pasteLabel: "Texto",
  emptySelection: "No hay texto seleccionado en el documento.",
  actions: "3. Qué hacer",
  summarize: "Resumir", summarizeHelp: "Las ideas principales en viñetas, elegidas del propio texto y redactadas por la IA. Funciona también con textos largos.",
  explain: "Explicar", explainHelp: "Lo explica con palabras sencillas.",
  rewrite: "Reescribir", rewriteHelp: "Mejora la claridad y la redacción sin cambiar el sentido.",
  translate: "Traducir", translateHelp: "Traduce al idioma que elijas, párrafo a párrafo.",
  outline: "Esquema", outlineHelp: "Títulos, secciones y subsecciones.",
  questions: "Generar preguntas", questionsHelp: "Preguntas de estudio con su respuesta en el texto.",
  analyze: "Analizar", analyzeHelp: "Datos, legibilidad, temas y estructura (sin descargar nada).",
  language: "Traducir a",
  request: "Pide lo que quieras",
  requestHelp: "Pregunta sobre el documento o pide algo: «Resume este documento y créame un DOCX», «Escribe una introducción», «Haz 5 preguntas»…",
  requestPlaceholder: "Tu pregunta o petición",
  send: "Enviar",
  result: "Resultado",
  stagePrepare: "Preparando IA",
  stageAnalyze: "Analizando documento",
  stageGenerate: "Generando respuesta",
  stageFormat: "Aplicando formato",
  stageCreate: "Creando documento (DOCX/PDF)",
  stageDone: "Documento listo",
  part: "Generando respuesta: parte {n} de {total}…",
  truncated: "El texto es largo: se usaron {used} de {total} caracteres.",
  cancel: "Cancelar",
  cancelled: "Cancelado.",
  copy: "Copiar",
  copied: "Copiado",
  insert: "Insertar en el documento",
  replace: "Reemplazar selección",
  below: "Añadir debajo",
  inserted: "Hecho: añadido al documento.",
  needText: "No hay texto que usar.",
  stats: "{secs} s",
  guide: "Cómo funciona",
  guideBody: "La IA corre dentro de tu navegador, en segundo plano: la página sigue respondiendo mientras trabaja. El contenido sale del propio texto (se eligen sus frases más representativas) y la IA solo lo redacta; todo lo que escribe se comprueba contra el original y lo que no se apoya en él se sustituye por la frase original. Revisa siempre el resultado.",
  clearCache: "Borrar modelos descargados",
  failed: "No se pudo generar un resultado fiable para este texto. Prueba con un fragmento más corto o con «Resumir» o «Analizar», que siempre funcionan.",
  openDoc: "Crear documento nuevo",
  openCreated: "Abrir el documento «{name}»",
  docCreated: "Documento creado en Mi unidad: «{name}».",
  downloadPdf: "Exportar PDF",
  downloadDocx: "Exportar DOCX",
  preview: "Vista previa",
  srcPasted: "texto pegado",
  srcSelected: "selección",
  partRewrite: "Generando respuesta: reescribiendo la parte {n} de {total}…",
  partTranslate: "Generando respuesta: traduciendo la parte {n} de {total}…",
  originModel: "redactado por la IA y comprobado con el texto original",
  originMixed: "{model} de {total} puntos redactados por la IA; el resto, frases literales del texto (lo que escribió no se apoyaba en el original)",
  originText: "frases elegidas del propio texto (la redacción de la IA no era fiel al original y se descartó)",
  originCalc: "calculado del propio texto",
  keptRewrite: "{kept} de {total} partes se dejaron como estaban (la reescritura cambiaba el contenido)",
  keptTranslate: "{kept} de {total} partes quedaron sin traducir (la traducción no era fiable)",
  untranslated: "[Sin traducir: no se obtuvo una traducción fiable de esta parte]",
  exported: "Descargado: {name}",
  actionNames: "Resumen|Explicación|Respuesta|Reescritura|Traducción|Esquema|Preguntas|Análisis|Contenido",
};
const EN: typeof ES = {
  ...ES,
  privacy: "Runs inside your browser. Your documents never leave the device: only the model is downloaded once and cached. The models belong to other authors (Qwen, LFM2, SmolLM2) and are not named Arqiven-N.",
  none: "This browser cannot run local AI. Try a recent Chrome, Edge, Firefox, or Safari.",
  modelGpuSmall: "Qwen2.5 0.5B",
  modelGpuLarge: "Qwen2.5 1.5B · more precise",
  modelCpu: "Qwen2.5 0.5B · compatible",
  modelCpuLarge: "Qwen2.5 1.5B · more precise, on devices with 8 GB or more",
  modelTiny: "SmolLM2 135M · third party",
  modelLfm: "LFM2 350M · third party",
  ready: "AI is ready on this device",
  readyDetail: "You can summarize, explain, or create a document.",
  advanced: "Advanced options",
  advancedHelp: "ORVUPI AI picks a mode that works on this device and remembers what worked. You don't need to change anything.",
  useModel: "Use this model",
  allFailed: "We could not start AI on this device right now. Check the connection (the model downloads the first time) and try again in a while. Meanwhile, Analyze works without a download.",
  source: "2. Text to use", actions: "3. What to do", srcOpen: "Open document", srcSelection: "Selected text", srcFile: "Another Work file", srcPaste: "Paste text",
  summarize: "Summarize", explain: "Explain", rewrite: "Rewrite", translate: "Translate", outline: "Outline", questions: "Questions", analyze: "Analyze",
  insert: "Insert into document", replace: "Replace selection", below: "Add below", copy: "Copy", cancel: "Cancel", send: "Send",
};

const LANGS = ["inglés", "español", "francés", "alemán", "italiano", "portugués", "catalán", "chino", "árabe"];
const TASKS: AiTask[] = ["summarize", "explain", "ask", "rewrite", "translate", "outline", "questions", "analyze", "generate"];
type Source = "open" | "selection" | "file" | "paste";
type Stage = "prepare" | "analyze" | "generate" | "format" | "create" | "done";
const STAGES: Stage[] = ["prepare", "analyze", "generate", "format", "create", "done"];

export function AiStudio({
  locale,
  storage,
  files,
  openDoc,
  onInsert,
  compact = false,
}: {
  locale: string;
  storage: StorageService | null;
  files: readonly FileRecord[];
  openDoc?: { name: string; text: () => string; selection: () => string };
  onInsert?: (markdown: string, mode?: InsertMode) => void;
  compact?: boolean;
}) {
  const L = locale.startsWith("en") ? EN : ES;
  const f = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  const engine = aiEngine();
  const [support, setSupport] = useState<AiSupport | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [manualId, setManualId] = useState<string>("");
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [preparing, setPreparing] = useState<"download" | "check" | "retry">("download");
  const [loadError, setLoadError] = useState("");
  const [source, setSource] = useState<Source>(openDoc ? "open" : "file");
  const choices = useMemo(() => aiFiles(files), [files]);
  const [fileId, setFileId] = useState("");
  const [paste, setPaste] = useState("");
  const [language, setLanguage] = useState(LANGS[0]!);
  const [request, setRequest] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [output, setOutputState] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const stopRef = useRef(false);
  const preparingRef = useRef<Promise<AiModel | null> | null>(null);
  const cachedRef = useRef<Record<string, boolean>>({});
  // Si ninguna opción funcionó, no se reintenta en cada acción (se vuelve a probar al pulsar «Preparar»)
  const allFailedRef = useRef(false);
  const uid = useId();

  // La vista previa se actualiza como mucho ~8 veces por segundo: repintar en cada token hacía ir la web a tirones
  const pendingOut = useRef<string | null>(null);
  const outTimer = useRef<number | null>(null);
  const setOutput = (text: string, now = false) => {
    pendingOut.current = text;
    if (now) {
      if (outTimer.current !== null) { window.clearTimeout(outTimer.current); outTimer.current = null; }
      setOutputState(text);
      return;
    }
    if (outTimer.current !== null) return;
    outTimer.current = window.setTimeout(() => {
      outTimer.current = null;
      if (pendingOut.current !== null) setOutputState(pendingOut.current);
    }, 120);
  };
  useEffect(() => () => { if (outTimer.current !== null) window.clearTimeout(outTimer.current); }, []);

  useEffect(() => {
    let alive = true;
    void detectAiSupport().then(async (found) => {
      if (!alive) return;
      setSupport(found);
      const list = usableModels(found);
      const flags: Record<string, boolean> = {};
      for (const model of list) flags[model.id] = await isModelCached(model);
      if (!alive) return;
      cachedRef.current = flags;
      setCached(flags);
      const already = list.find((model) => engine.isLoaded(model));
      if (already) { setModelId(already.id); setPhase("ready"); return; }
      // Precarga inteligente: si ya funcionó aquí y está descargado, se prepara sola (desde OPFS, sin descargar)
      const mem = readDeviceMemory(found);
      if (mem.good && flags[mem.good]) void prepare(found);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    if (!fileId && choices[0]) setFileId(choices[0].id);
  }, [choices, fileId]);

  const models = support ? usableModels(support) : [];
  const model: AiModel | undefined = models.find((item) => item.id === modelId);
  const chain = support ? modelChain(support, readDeviceMemory(support)) : [];
  const first = chain[0];

  /** Prepara la IA sola. Prueba WebGPU y, con una generación corta, comprueba que el texto es válido.
   *  Si falla, pasa a WASM y después a otro modelo compatible. Los que ya están descargados se prueban
   *  antes de empezar una descarga nueva. El usuario no elige el modo. */
  function prepare(found: AiSupport | null = support, preferredId?: string, skip: string[] = []): Promise<AiModel | null> {
    if (!found) return Promise.resolve(null);
    if (preparingRef.current && !preferredId && skip.length === 0) return preparingRef.current;
    const job = (async () => {
      allFailedRef.current = false;
      setPhase("loading");
      setLoadError("");
      let lastKind = "";
      let downloadsBlocked = false;
      const cachedIds = Object.entries(cachedRef.current).filter(([, on]) => on).map(([id]) => id);
      const list = bootCandidates(found, readDeviceMemory(found), cachedIds, preferredId, skip);
      for (let i = 0; i < list.length; i += 1) {
        const candidate = list[i]!;
        const have = Boolean(cachedRef.current[candidate.id]);
        if (downloadsBlocked && !have) continue;
        setModelId(candidate.id);
        setProgress(null);
        setPreparing(i === 0 ? "download" : "retry");
        try {
          await engine.load(candidate, (loaded, total) => { setPreparing(i === 0 ? "download" : "retry"); setProgress({ loaded, total }); }, () => setPreparing("check"));
          rememberModel(found, candidate.id, true);
          allFailedRef.current = false;
          cachedRef.current = { ...cachedRef.current, [candidate.id]: true };
          setCached(cachedRef.current);
          setPhase("ready");
          return candidate;
        } catch (error) {
          const kind = (error as { kind?: string }).kind ?? "other";
          lastKind = kind;
          console.info("[ORVUPI AI] no funcionó", candidate.id, kind, error instanceof Error ? error.message.slice(0, 160) : "");
          // Sin red se pueden seguir probando los modelos ya descargados. Un fallo de ejecución sí se recuerda.
          if (blocksFurtherDownloads(kind)) downloadsBlocked = true;
          else rememberModel(found, candidate.id, false);
        }
      }
      allFailedRef.current = true;
      setPhase("error");
      setLoadError(lastKind === "offline" || lastKind === "network" || lastKind === "blocked" ? L.offline : lastKind === "quota" ? L.quota : L.allFailed);
      return null;
    })();
    preparingRef.current = job;
    void job.finally(() => { if (preparingRef.current === job) preparingRef.current = null; });
    return job;
  }

  async function ensureModel(): Promise<AiModel | null> {
    if (model && engine.isLoaded(model)) return model;
    if (allFailedRef.current) return null;
    return prepare();
  }

  async function sourceText(): Promise<string> {
    if (source === "open") return openDoc?.text() ?? "";
    if (source === "selection") return openDoc?.selection() ?? "";
    if (source === "paste") return paste;
    if (!storage || !fileId) return "";
    return (await textOfFile(storage, fileId)).text;
  }

  function sourceName(): string {
    if (source === "open") return openDoc?.name ?? "";
    if (source === "selection") return `${L.srcSelected} de ${openDoc?.name ?? ""}`.trim();
    if (source === "paste") return L.srcPasted;
    return choices.find((file) => file.id === fileId)?.name ?? "";
  }

  function titleFor(task: AiTask, lang = language): string {
    const names = L.actionNames.split("|");
    const label = names[TASKS.indexOf(task)] ?? "ORVUPI AI";
    const name = sourceName();
    return `${label}${task === "translate" ? ` al ${lang}` : ""}${name ? ` · ${name}` : ""}`.slice(0, 120);
  }

  /** Genera con control de calidad. Si la salida degenera dos veces con la GPU, cambia sola a otro modo (CPU u otro
   *  modelo), lo recuerda y repite; el usuario no tiene que elegir nada. */
  async function generateClean(task: AiTask, messages: ChatMessage[], maxTokens: number): Promise<{ text: string; tokens: number } | null> {
    const copies = task === "rewrite" || task === "translate";
    const attempts = [
      { repetitionPenalty: copies ? 1.05 : 1.15, noRepeatNgram: 0 },
      { repetitionPenalty: copies ? 1.1 : 1.2, noRepeatNgram: copies ? 0 : 12, sample: true },
    ];
    for (let round = 0; round < 2; round += 1) {
      const current = await ensureModel();
      if (!current) return null;
      let tokens = 0;
      for (const options of attempts) {
        if (stopRef.current) return null;
        let acc = "";
        const r = await (coreEnabled()
          ? runWorkGenerate(
            buildWorkRequest({ task, messages, contextRefs: fileId ? [fileId] : [] }),
            async () => {
              const next = await engine.generate(messages, maxTokens, (chunk) => { acc += chunk; setOutput(cleanOutput(acc)); }, options);
              return { ...next, modelId: current.id, provider: "third-party" as const, mode: "model" as const, checkpoint: false };
            },
          )
          : engine.generate(messages, maxTokens, (chunk) => { acc += chunk; setOutput(cleanOutput(acc)); }, options)).catch(() => null);
        if (!r) break;
        tokens += r.tokens;
        const text = cleanOutput(r.text);
        if (!r.degenerate && text) return { text, tokens };
        console.info("[ORVUPI AI] salida descartada por degenerada; reintento", r.text.slice(0, 120));
      }
      if (round === 0 && current.device === "webgpu" && support && !stopRef.current) {
        rememberModel(support, current.id, false);
        setStage("prepare");
        const next = await prepare(support, undefined, [current.id]);
        setStage("generate");
        if (!next) return null;
        continue;
      }
      return null;
    }
    return null;
  }

  async function saveAsDocument(markdown: string, title: string, open: boolean): Promise<void> {
    if (!storage) return;
    const id = createId();
    const file = createOrvdoc({ id, title, content: markdownToDoc(markdown) });
    await storage.saveFile({ id, name: title, kind: "doc", mime: "application/vnd.orvupi.doc+json", bytes: serializeOrvdoc(file), folderId: null });
    // Cada paso en su propia tarea: guardar, avisar a la lista de archivos y abrir la ventana no se suman en una sola tarea larga
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
    setCreated({ id, name: title });
    if (open) openEditorWindow("doc", id);
    await tick();
    publishFilesChanged();
  }

  async function exportAs(kind: "pdf" | "docx", markdown = output, titleIn = docTitle) {
    const title = titleIn || "ORVUPI AI";
    const safe = title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
    if (kind === "docx") {
      const { exportDocx } = await import("../docs/docx");
      downloadBytes(await exportDocx(title, markdownToDoc(markdown, title), title, "ORVUPI Work", true), `${safe}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } else {
      const { exportPdf } = await import("../docs/pdf");
      downloadBytes(await exportPdf(title, markdownToDoc(markdown)), `${safe}.pdf`, "application/pdf");
    }
    setStatus(f(L.exported, { name: `${safe}.${kind}` }));
  }

  async function run(task: AiTask, opts: { request?: string; exportAs?: "docx" | "pdf"; language?: string } = {}) {
    setNote("");
    const raw = (await sourceText()).trim();
    const full = cleanInput(raw);
    if (!full && task !== "generate") { setNote(source === "selection" ? L.emptySelection : L.needText); return; }
    setBusy(true);
    stopRef.current = false;
    setOutput("", true);
    setCreated(null);
    const lang = opts.language ?? language;
    const title = titleFor(task, lang);
    setDocTitle(title);
    const started = performance.now();
    let tokens = 0;
    const generate: Generate = async (messages, maxTokens) => {
      if (stopRef.current) return null;
      setStage("generate");
      const r = await generateClean(task, messages, maxTokens);
      if (r) tokens += r.tokens;
      return r?.text ?? null;
    };
    try {
      if (task !== "analyze") {
        setStage("prepare");
        setStatus(L.stagePrepare);
        await ensureModel();
        if (stopRef.current) throw new Error(L.cancelled);
      }
      setStage("analyze");
      setStatus(L.stageAnalyze);
      await new Promise((r) => setTimeout(r, 0));
      const limit = CHUNK_CHARS * MAX_PARTS;
      const text = full.length > limit ? full.slice(0, limit) : full;
      const truncated = text.length < full.length;
      let result = "";
      let origin = "";
      const originOf = (r: HybridResult) => (r.mode === "model" ? L.originModel : r.mode === "mixed" ? f(L.originMixed, { model: r.fromModel, total: r.fromModel + r.fromText }) : L.originText);
      if (task === "analyze") {
        result = (await hybridAnalyze(text)).markdown;
        origin = L.originCalc;
      } else if (task === "summarize" || task === "explain" || task === "outline" || task === "ask" || task === "questions") {
        const question = opts.request ?? "";
        const r = task === "summarize"
          ? await hybridSummary(text, generate, (n, total) => setStatus(total > 1 ? f(L.part, { n, total }) : L.stageGenerate))
          : task === "explain" ? await hybridExplain(text, generate)
          : task === "outline" ? await hybridOutline(text, generate)
          : task === "questions" ? await hybridQuestions(text, generate)
          : await hybridAsk(text, question, generate);
        result = task === "ask" ? `**${question.trim()}**\n\n${r.markdown}` : r.markdown;
        origin = originOf(r);
        if (task === "ask") setHistory((h) => [...h, { role: "user" as const, content: question }, { role: "assistant" as const, content: "answer" in r ? String(r.answer) : r.markdown }].slice(-8));
      } else if (task === "generate") {
        const r = await hybridGenerate(opts.request ?? "", text, generate).catch(() => null);
        if (!r) throw new Error(L.failed);
        result = r.markdown;
        origin = L.originModel;
      } else {
        // Reescribir y traducir: por trozos cortos; cada trozo se comprueba (fiel, sin inventar, idioma correcto)
        const chunks = paragraphChunks(text);
        const toSpanish = /español/i.test(lang);
        let kept = 0;
        for (let i = 0; i < chunks.length && !stopRef.current; i += 1) {
          if (chunks.length > 1) setStatus(f(task === "translate" ? L.partTranslate : L.partRewrite, { n: i + 1, total: chunks.length }));
          const chunk = chunks[i]!;
          const messages = task === "rewrite" ? rewriteMessages(chunk) : buildMessages("translate", chunk, { language: lang });
          const out = await generate(messages, Math.min(900, Math.ceil(chunk.length / 2.2) + 80));
          const ok = out !== null && (task === "rewrite" ? rewriteOk(out, chunk) : translationOk(out, chunk, toSpanish));
          if (!ok) kept += 1;
          // Si las dos primeras partes ya fallan, este modelo no sirve para este texto: no se hace esperar más
          if (i === 1 && kept === 2 && chunks.length > 2) { kept = chunks.length; break; }
          result += `${ok ? out : task === "translate" ? `*${L.untranslated}*\n\n${chunk}` : chunk}\n\n`;
          setOutput(result.trim());
        }
        if (kept === chunks.length) throw new Error(L.failed);
        origin = kept ? f(task === "translate" ? L.keptTranslate : L.keptRewrite, { kept, total: chunks.length }) : L.originModel;
      }
      if (stopRef.current) throw new Error(L.cancelled);
      setStage("format");
      setStatus(L.stageFormat);
      result = result.trim();
      setOutput(result, true);
      // Se cede el hilo entre pintar el resultado y crear el documento: así ninguna tarea pasa de 50 ms
      await new Promise((resolve) => setTimeout(resolve, 0));
      // El resultado principal es un documento: se crea en Mi unidad y se abre; y si se pidió, también el DOCX/PDF
      setStage("create");
      setStatus(L.stageCreate);
      if (result) await saveAsDocument(result, title, !opts.exportAs);
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (opts.exportAs) await exportAs(opts.exportAs, result, title);
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      setStage("done");
      setStatus(`${L.stageDone} · ${f(L.stats, { secs })}${tokens ? ` · ${tokens} fragmentos` : ""}${origin ? ` · ${origin}` : ""}${truncated ? ` · ${f(L.truncated, { used: text.length, total: full.length })}` : ""}`);
    } catch (error) {
      setStage(null);
      setOutput(pendingOut.current ?? "", true);
      setStatus(error instanceof Error && error.message ? error.message : L.failed);
    } finally {
      setBusy(false);
    }
  }

  function sendRequest() {
    const text = request.trim();
    if (!text) return;
    const intent = parseRequest(text);
    if (intent.language) setLanguage(intent.language);
    setRequest("");
    void run(intent.action, { request: text, exportAs: intent.export, language: intent.language });
  }

  function cancel() {
    stopRef.current = true;
    engine.stop();
  }

  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  const actions: Array<[AiTask, string, string]> = [
    ["summarize", L.summarize, L.summarizeHelp],
    ["explain", L.explain, L.explainHelp],
    ["rewrite", L.rewrite, L.rewriteHelp],
    ["translate", L.translate, L.translateHelp],
    ["outline", L.outline, L.outlineHelp],
    ["questions", L.questions, L.questionsHelp],
    ["analyze", L.analyze, L.analyzeHelp],
  ];
  const stageLabel: Record<Stage, string> = { prepare: L.stagePrepare, analyze: L.stageAnalyze, generate: L.stageGenerate, format: L.stageFormat, create: L.stageCreate, done: L.stageDone };
  const loadingText = preparing === "check" ? L.compiling : preparing === "retry" ? L.trying : progress && progress.total > 0 && progress.loaded < progress.total ? f(L.loading, { pct, done: formatBytes(progress.loaded, locale), total: formatBytes(progress.total, locale) }) : L.compiling;

  return (
    <div className={`ow-aistudio${compact ? " is-compact" : ""}`} data-ai-phase={phase}>
      <p className="ow-ai-privacy">{L.privacy}</p>
      <section aria-labelledby={`ow-ai-model-${uid}`}>
        <h3 id={`ow-ai-model-${uid}`}>{L.model}</h3>
        {!support ? <p role="status">{L.checking}</p> : models.length === 0 ? <p role="alert">{L.none}</p> : (
          <>
            {phase === "ready" && model ? (
              <p className="ow-ai-ready" role="status">✅ {L.ready} <small>· {L.readyDetail}</small></p>
            ) : phase === "loading" ? (
              <div className="ow-ai-progress">
                <div role="progressbar" aria-label={L.stagePrepare} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${preparing === "check" ? 100 : pct}%` }} /></div>
                <p role="status">{loadingText}</p>
                <button type="button" className="ow-button ow-button-ghost" onClick={() => { engine.reset(); setPhase("idle"); preparingRef.current = null; }}>{L.cancel}</button>
              </div>
            ) : (
              <button type="button" className="ow-button ow-button-primary" data-ai-prepare onClick={() => { allFailedRef.current = false; void prepare(); }}>
                {first && cached[first.id] ? L.prepareCached : f(L.prepare, { size: formatBytes((first?.sizeMb ?? 0) * 1_000_000, locale) })}
              </button>
            )}
            {phase === "error" ? <p role="alert" className="ow-ai-error">{loadError}</p> : null}
            <details className="ow-ai-advanced">
              <summary>{L.advanced}</summary>
              <p>{L.advancedHelp}</p>
              <label className="ow-field">
                <span>{L.pickModel}</span>
                <select value={manualId || modelId || first?.id || ""} disabled={phase === "loading" || busy} onChange={(event) => setManualId(event.target.value)}>
                  {models.map((item) => (
                    <option key={item.id} value={item.id}>
                      {L[item.label]} · {formatBytes(item.sizeMb * 1_000_000, locale)}{item.id === first?.id ? ` · ${L.recommended}` : ""}{cached[item.id] ? ` · ${L.cached}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ow-row">
                <button type="button" className="ow-button" disabled={phase === "loading" || busy} onClick={() => { const id = manualId || modelId || first?.id; if (id) void prepare(support, id); }}>{L.useModel}</button>
                <button type="button" className="ow-button ow-button-ghost" disabled={busy || phase !== "ready"} onClick={() => { engine.unload(); setPhase("idle"); setStatus(L.freed); }}>{L.free}</button>
              </div>
            </details>
          </>
        )}
      </section>

      <section aria-labelledby={`ow-ai-source-${uid}`}>
        <h3 id={`ow-ai-source-${uid}`}>{L.source}</h3>
        <div className="ow-ai-sources" role="radiogroup" aria-labelledby={`ow-ai-source-${uid}`}>
          {(openDoc ? (["open", "selection", "file", "paste"] as const) : (["file", "paste"] as const)).map((value) => (
            <label key={value} className={source === value ? "is-on" : ""}>
              <input type="radio" name={`ow-ai-src-${uid}`} value={value} checked={source === value} onChange={() => setSource(value)} />
              {value === "open" ? `${L.srcOpen}${openDoc ? `: ${openDoc.name}` : ""}` : value === "selection" ? L.srcSelection : value === "file" ? L.srcFile : L.srcPaste}
            </label>
          ))}
        </div>
        {source === "file" ? (choices.length === 0 ? <p>{L.noFiles}</p> : (
          <label className="ow-field">
            <span>{L.pickFile}</span>
            <select value={fileId} onChange={(event) => setFileId(event.target.value)}>
              {choices.map((file) => <option key={file.id} value={file.id}>{file.name} ({file.kind === "doc" ? "Docs" : file.kind === "sheet" ? "Hojas" : file.kind === "slide" ? "Presentaciones" : "Notas"})</option>)}
            </select>
          </label>
        )) : null}
        {source === "paste" ? (
          <label className="ow-field">
            <span>{L.pasteLabel}</span>
            <textarea rows={compact ? 4 : 6} value={paste} onChange={(event) => setPaste(event.target.value)} />
          </label>
        ) : null}
      </section>

      <section aria-labelledby={`ow-ai-actions-${uid}`}>
        <h3 id={`ow-ai-actions-${uid}`}>{L.actions}</h3>
        <ul className="ow-ai-grid">
          {actions.map(([task, label, help]) => (
            <li key={task}>
              <button type="button" className="ow-button" disabled={busy} onClick={() => void run(task)}>{label}</button>
              <p>{help}</p>
              {task === "translate" ? (
                <label className="ow-field ow-ai-lang">
                  <span>{L.language}</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    {LANGS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </label>
              ) : null}
            </li>
          ))}
        </ul>
        <form className="ow-ai-ask" onSubmit={(event) => { event.preventDefault(); sendRequest(); }}>
          <label className="ow-field">
            <span>{L.request}</span>
            <input value={request} placeholder={L.requestPlaceholder} onChange={(event) => setRequest(event.target.value)} />
          </label>
          <button type="submit" className="ow-button" disabled={busy || !request.trim()}>{L.send}</button>
          <p className="ow-ai-hint">{L.requestHelp}</p>
        </form>
        {history.length > 0 ? (
          <ol className="ow-ai-chat" aria-label={L.request}>
            {history.map((message, i) => <li key={i} data-role={message.role}>{message.content}</li>)}
          </ol>
        ) : null}
      </section>

      {note ? <p role="alert" className="ow-ai-error">{note}</p> : null}
      {output || busy || status ? (
        <section aria-labelledby={`ow-ai-result-${uid}`} className="ow-ai-result">
          <h3 id={`ow-ai-result-${uid}`}>{L.result}</h3>
          {stage ? (
            <ol className="ow-ai-stages" aria-label={L.result}>
              {STAGES.map((s) => {
                const at = STAGES.indexOf(stage);
                const me = STAGES.indexOf(s);
                return <li key={s} data-state={me < at || stage === "done" ? "done" : me === at ? "now" : "todo"}>{stageLabel[s]}</li>;
              })}
            </ol>
          ) : null}
          {output ? <p className="ow-ai-preview-label">{L.preview}{docTitle ? ` · ${docTitle}` : ""}</p> : null}
          <div className="ow-ai-output" aria-live="polite" aria-busy={busy}><Formatted markdown={output} /></div>
          <p role="status" className="ow-ai-status">{status}</p>
          <div className="ow-row ow-ai-actions-out">
            {busy ? <button type="button" className="ow-button" data-ai-cancel onClick={cancel}>{L.cancel}</button> : null}
            {output && !busy && onInsert ? <button type="button" className="ow-button" onClick={() => { onInsert(output, "insert"); setStatus(L.inserted); }}>{L.insert}</button> : null}
            {output && !busy && onInsert && source === "selection" ? <button type="button" className="ow-button" onClick={() => { onInsert(output, "replace"); setStatus(L.inserted); }}>{L.replace}</button> : null}
            {output && !busy && onInsert ? <button type="button" className="ow-button" onClick={() => { onInsert(output, "below"); setStatus(L.inserted); }}>{L.below}</button> : null}
            {output && !busy ? <button type="button" className="ow-button" onClick={() => { void navigator.clipboard?.writeText(markdownToPlain(output)).then(() => setNote(""), () => undefined); setStatus(L.copied); }}>{L.copy}</button> : null}
            {output && !busy && storage ? (
              created
                ? <a className="ow-button ow-button-primary" href={editorPath("doc", created.id)} target="_blank" rel="noopener" data-ai-open-doc>{f(L.openCreated, { name: created.name })}</a>
                : <button type="button" className="ow-button ow-button-primary" data-ai-open-doc onClick={() => void saveAsDocument(output, docTitle || "ORVUPI AI", true)}>{L.openDoc}</button>
            ) : null}
            {output && !busy ? <button type="button" className="ow-button" onClick={() => void exportAs("docx")}>{L.downloadDocx}</button> : null}
            {output && !busy ? <button type="button" className="ow-button" onClick={() => void exportAs("pdf")}>{L.downloadPdf}</button> : null}
          </div>
          {created && !busy ? <p className="ow-ai-created" role="status">{f(L.docCreated, { name: created.name })}</p> : null}
        </section>
      ) : null}

      <details className="ow-ai-guide">
        <summary>{L.guide}</summary>
        <p>{L.guideBody}</p>
        <button type="button" className="ow-button ow-button-ghost" onClick={() => { engine.reset(); void import("./engine").then((m) => m.removeCachedModels()).then(() => { cachedRef.current = {}; setCached({}); setPhase("idle"); }); }}>{L.clearCache}</button>
      </details>
    </div>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return <>{spans.map((s, i) => (s.bold && s.italic ? <strong key={i}><em>{s.text}</em></strong> : s.bold ? <strong key={i}>{s.text}</strong> : s.italic ? <em key={i}>{s.text}</em> : <span key={i}>{s.text}</span>))}</>;
}

/** Resultado con formato (títulos, listas, negrita, tablas), sin innerHTML. */
function Formatted({ markdown }: { markdown: string }) {
  const blocks: MdBlock[] = useMemo(() => parseMarkdown(markdown), [markdown]);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "heading") return block.level === 1 ? <h4 key={i}><Spans spans={block.spans} /></h4> : block.level === 2 ? <h5 key={i}><Spans spans={block.spans} /></h5> : <h6 key={i}><Spans spans={block.spans} /></h6>;
        if (block.type === "paragraph") return <p key={i}><Spans spans={block.spans} /></p>;
        if (block.type === "bullet") return <ul key={i}>{block.items.map((item, j) => <li key={j}><Spans spans={item} /></li>)}</ul>;
        if (block.type === "pageBreak") return <hr key={i} className="ow-ai-pagebreak" />;
        if (block.type === "table") {
          return (
            <table key={i}>
              <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => (block.header && r === 0 ? <th key={c}><Spans spans={cell} /></th> : <td key={c}><Spans spans={cell} /></td>))}</tr>)}</tbody>
            </table>
          );
        }
        return <ol key={i} start={block.start}>{block.items.map((item, j) => <li key={j}><Spans spans={item} /></li>)}</ol>;
      })}
    </>
  );
}
