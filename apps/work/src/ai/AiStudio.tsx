import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FileRecord, StorageService } from "../storage/types";
import { formatBytes } from "../security/names";
import { aiEngine, detectAiSupport, isModelCached, recommendedModel, usableModels, type AiModel, type AiSupport, type ChatMessage } from "./engine";
import { buildMessages, combineMessages, MAX_PARTS, MAX_TOKENS, splitText, type AiAction } from "./prompts";
import { aiFiles, textOfFile } from "./sources";

const ES = {
  title: "ORVUPI AI",
  privacy: "Funciona dentro de tu navegador. Tus documentos no salen del dispositivo: solo se descarga el modelo la primera vez y queda guardado.",
  model: "1. Modelo",
  checking: "Comprobando qué puede ejecutar este dispositivo…",
  none: "Este navegador no puede ejecutar el modelo (no tiene WebAssembly con Web Workers). Prueba con Chrome, Edge, Firefox o Safari recientes.",
  modelGpuSmall: "Qwen2.5 0.5B · rápido con la GPU (WebGPU)",
  modelGpuLarge: "Qwen2.5 1.5B · más preciso con la GPU (WebGPU)",
  modelCpu: "Qwen2.5 0.5B · sin GPU (WASM, más lento)",
  modelCpuLarge: "Qwen2.5 1.5B · más preciso sin GPU (lento, ordenadores con 8 GB o más)",
  modelTiny: "SmolLM2 135M · muy ligero (resultados básicos, mejor en inglés)",
  recommended: "recomendado",
  cached: "descargado",
  download: "Descargar y activar ({size})",
  activate: "Activar",
  ready: "Listo: {model}",
  loading: "Descargando el modelo… {pct} % ({done} de {total})",
  compiling: "Preparando el modelo…",
  noGpu: "Este dispositivo no ofrece WebGPU con f16: se usará el modo sin GPU (más lento pero funciona).",
  mobileNote: "En el móvil la primera respuesta puede tardar; el modelo muy ligero es más rápido.",
  loadError: "No se pudo cargar el modelo: {error}. Prueba con el modelo más ligero o revisa la conexión para la primera descarga.",
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
  summarize: "Resumir", summarizeHelp: "Las ideas principales en viñetas. Los textos largos se resumen por partes.",
  explain: "Explicar", explainHelp: "Lo explica con palabras sencillas y ejemplos.",
  ask: "Preguntar", askHelp: "Chatea sobre el texto: responde solo con lo que pone.",
  rewrite: "Reescribir", rewriteHelp: "Mejora la claridad y la redacción sin cambiar el sentido.",
  translate: "Traducir", translateHelp: "Traduce al idioma que elijas.",
  outline: "Esquema", outlineHelp: "Títulos y subtítulos para organizar el texto.",
  language: "Traducir a",
  question: "Tu pregunta",
  send: "Enviar",
  result: "Resultado",
  working: "Generando…",
  part: "Resumiendo la parte {n} de {total}…",
  truncated: "El texto es largo: se usaron {used} de {total} caracteres.",
  stop: "Detener",
  copy: "Copiar",
  copied: "Copiado",
  insert: "Insertar en el documento",
  inserted: "Insertado en el documento",
  needModel: "Primero activa un modelo (paso 1).",
  needText: "No hay texto que usar.",
  stats: "{tokens} fragmentos en {secs} s",
  guide: "Cómo funciona",
  guideBody: "Elige un modelo y descárgalo una vez (queda en la caché del navegador). Después elige el texto: el documento abierto, lo que tengas seleccionado, cualquier archivo de Work o un texto pegado. Pulsa una acción y verás la respuesta mientras se escribe. Puedes copiarla o insertarla en el documento. Es un modelo pequeño: revisa siempre el resultado.",
  clearCache: "Borrar modelos descargados",
};
const EN: typeof ES = {
  ...ES,
  privacy: "Runs inside your browser. Your documents never leave the device: only the model is downloaded once and cached.",
  model: "1. Model", source: "2. Text to use", actions: "3. What to do", srcOpen: "Open document", srcSelection: "Selected text", srcFile: "Another Work file", srcPaste: "Paste text",
  summarize: "Summarize", explain: "Explain", ask: "Ask", rewrite: "Rewrite", translate: "Translate", outline: "Outline", insert: "Insert into document", copy: "Copy", stop: "Stop", send: "Send",
};

const LANGS = ["inglés", "español", "francés", "alemán", "italiano", "portugués", "catalán", "chino", "árabe"];
type Source = "open" | "selection" | "file" | "paste";

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
  onInsert?: (text: string) => void;
  compact?: boolean;
}) {
  const L = locale.startsWith("en") ? EN : ES;
  const f = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  const engine = aiEngine();
  const [support, setSupport] = useState<AiSupport | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [source, setSource] = useState<Source>(openDoc ? "open" : "file");
  const choices = useMemo(() => aiFiles(files), [files]);
  const [fileId, setFileId] = useState("");
  const [paste, setPaste] = useState("");
  const [language, setLanguage] = useState(LANGS[0]!);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef(false);
  const uid = useId();

  useEffect(() => {
    let alive = true;
    void detectAiSupport().then(async (found) => {
      if (!alive) return;
      setSupport(found);
      const best = recommendedModel(found);
      const list = usableModels(found);
      const flags: Record<string, boolean> = {};
      for (const model of list) flags[model.id] = await isModelCached(model);
      if (!alive) return;
      setCached(flags);
      const already = list.find((model) => engine.isLoaded(model));
      setModelId(already?.id ?? list.find((model) => flags[model.id])?.id ?? best?.id ?? "");
      if (already) setPhase("ready");
    });
    return () => { alive = false; };
  }, [engine]);

  useEffect(() => {
    if (!fileId && choices[0]) setFileId(choices[0].id);
  }, [choices, fileId]);

  const models = support ? usableModels(support) : [];
  const model: AiModel | undefined = models.find((item) => item.id === modelId);
  const best = support ? recommendedModel(support) : null;

  async function activate() {
    if (!model) return;
    setPhase("loading");
    setLoadError("");
    setProgress(null);
    try {
      await engine.load(model, (loaded, total) => setProgress({ loaded, total }));
      setCached((c) => ({ ...c, [model.id]: true }));
      setPhase("ready");
    } catch (error) {
      setPhase("error");
      setLoadError(f(L.loadError, { error: error instanceof Error ? error.message : String(error) }));
    }
  }

  async function sourceText(): Promise<string> {
    if (source === "open") return openDoc?.text() ?? "";
    if (source === "selection") return openDoc?.selection() ?? "";
    if (source === "paste") return paste;
    if (!storage || !fileId) return "";
    return (await textOfFile(storage, fileId)).text;
  }

  async function run(action: AiAction) {
    setNote("");
    if (phase !== "ready" || !model || !engine.isLoaded(model)) { setNote(L.needModel); return; }
    const text = (await sourceText()).trim();
    if (!text) { setNote(source === "selection" ? L.emptySelection : L.needText); return; }
    if (action === "ask" && !question.trim()) return;
    setBusy(true);
    stopRef.current = false;
    setOutput("");
    setStatus(L.working);
    const started = performance.now();
    let tokens = 0;
    try {
      const parts = splitText(text);
      const used = parts.slice(0, MAX_PARTS);
      const usedChars = used.reduce((n, p) => n + p.length, 0);
      const truncated = usedChars < text.length - 10;
      let result = "";
      if (action === "summarize" && used.length > 1) {
        const partials: string[] = [];
        for (let i = 0; i < used.length && !stopRef.current; i += 1) {
          setStatus(f(L.part, { n: i + 1, total: used.length }));
          const r = await engine.generate(buildMessages("summarize", used[i]!), 220, () => undefined);
          tokens += r.tokens;
          partials.push(r.text.trim());
        }
        setStatus(L.working);
        const final = await engine.generate(combineMessages(partials), MAX_TOKENS.summarize, (chunk) => setOutput((o) => o + chunk));
        tokens += final.tokens;
        result = final.text;
      } else if ((action === "rewrite" || action === "translate") && used.length > 1) {
        for (let i = 0; i < used.length && !stopRef.current; i += 1) {
          setStatus(f(L.part, { n: i + 1, total: used.length }).replace(/Resumiendo/, action === "translate" ? "Traduciendo" : "Reescribiendo"));
          const r = await engine.generate(buildMessages(action, used[i]!, { language }), MAX_TOKENS[action], (chunk) => setOutput((o) => o + chunk));
          tokens += r.tokens;
          result += `${r.text.trim()}\n\n`;
          setOutput((o) => `${o}\n\n`);
        }
      } else {
        const body = used[0]!;
        const messages = buildMessages(action, body, { question, language, history });
        const r = await engine.generate(messages, MAX_TOKENS[action], (chunk) => setOutput((o) => o + chunk));
        tokens += r.tokens;
        result = r.text;
        if (action === "ask") {
          setHistory((h) => [...h, { role: "user" as const, content: question }, { role: "assistant" as const, content: r.text }].slice(-8));
          setQuestion("");
        }
      }
      setOutput(result.trim());
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      setStatus(`${f(L.stats, { tokens, secs })}${truncated ? ` · ${f(L.truncated, { used: usedChars, total: text.length })}` : ""}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  const actions: Array<[AiAction, string, string]> = [
    ["summarize", L.summarize, L.summarizeHelp],
    ["explain", L.explain, L.explainHelp],
    ["rewrite", L.rewrite, L.rewriteHelp],
    ["translate", L.translate, L.translateHelp],
    ["outline", L.outline, L.outlineHelp],
  ];

  return (
    <div className={`ow-aistudio${compact ? " is-compact" : ""}`} data-ai-phase={phase}>
      <p className="ow-ai-privacy">{L.privacy}</p>
      <section aria-labelledby={`ow-ai-model-${uid}`}>
        <h3 id={`ow-ai-model-${uid}`}>{L.model}</h3>
        {!support ? <p role="status">{L.checking}</p> : models.length === 0 ? <p role="alert">{L.none}</p> : (
          <>
            {!support.f16 || !support.webgpu ? <p className="ow-ai-note">{L.noGpu}</p> : null}
            {support.mobile ? <p className="ow-ai-note">{L.mobileNote}</p> : null}
            <label className="ow-field">
              <span>{L.model.replace(/^1\.\s*/, "")}</span>
              <select value={modelId} disabled={phase === "loading" || busy} onChange={(event) => { setModelId(event.target.value); setPhase(models.find((m) => m.id === event.target.value && engine.isLoaded(m)) ? "ready" : "idle"); }}>
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {L[item.label]} · {formatBytes(item.sizeMb * 1_000_000, locale)}{item.id === best?.id ? ` · ${L.recommended}` : ""}{cached[item.id] ? ` · ${L.cached}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {phase === "ready" && model ? <p className="ow-ai-ready" role="status">✅ {f(L.ready, { model: L[model.label] })}</p> : (
              <button type="button" className="ow-button ow-button-primary" disabled={!model || phase === "loading"} onClick={() => void activate()}>
                {model && cached[model.id] ? L.activate : f(L.download, { size: formatBytes((model?.sizeMb ?? 0) * 1_000_000, locale) })}
              </button>
            )}
            {phase === "loading" ? (
              <div className="ow-ai-progress">
                <div role="progressbar" aria-label={L.model} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
                <p role="status">{progress && progress.loaded >= progress.total ? L.compiling : f(L.loading, { pct, done: formatBytes(progress?.loaded ?? 0, locale), total: formatBytes(progress?.total ?? 0, locale) })}</p>
              </div>
            ) : null}
            {phase === "error" ? <p role="alert" className="ow-ai-error">{loadError}</p> : null}
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
          {actions.map(([action, label, help]) => (
            <li key={action}>
              <button type="button" className="ow-button" disabled={busy} onClick={() => void run(action)}>{label}</button>
              <p>{help}</p>
              {action === "translate" ? (
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
        <form className="ow-ai-ask" onSubmit={(event) => { event.preventDefault(); void run("ask"); }}>
          <label className="ow-field">
            <span>{L.ask} · {L.askHelp}</span>
            <input value={question} placeholder={L.question} onChange={(event) => setQuestion(event.target.value)} />
          </label>
          <button type="submit" className="ow-button" disabled={busy || !question.trim()}>{L.send}</button>
        </form>
        {history.length > 0 ? (
          <ol className="ow-ai-chat" aria-label={L.ask}>
            {history.map((message, i) => <li key={i} data-role={message.role}>{message.content}</li>)}
          </ol>
        ) : null}
      </section>

      {note ? <p role="alert" className="ow-ai-error">{note}</p> : null}
      {output || busy || status ? (
        <section aria-labelledby={`ow-ai-result-${uid}`} className="ow-ai-result">
          <h3 id={`ow-ai-result-${uid}`}>{L.result}</h3>
          <div className="ow-ai-output" aria-live="polite" aria-busy={busy}>{output}</div>
          <p role="status" className="ow-ai-status">{status}</p>
          <div className="ow-row">
            {busy ? <button type="button" className="ow-button" onClick={() => { stopRef.current = true; engine.stop(); }}>{L.stop}</button> : null}
            {output && !busy ? <button type="button" className="ow-button" onClick={() => { void navigator.clipboard?.writeText(output).then(() => setNote(""), () => undefined); setStatus(L.copied); }}>{L.copy}</button> : null}
            {output && !busy && onInsert ? <button type="button" className="ow-button ow-button-primary" onClick={() => { onInsert(output); setStatus(L.inserted); }}>{L.insert}</button> : null}
          </div>
        </section>
      ) : null}

      <details className="ow-ai-guide">
        <summary>{L.guide}</summary>
        <p>{L.guideBody}</p>
        <button type="button" className="ow-button ow-button-ghost" onClick={() => { engine.reset(); void import("./engine").then((m) => m.removeCachedModels()).then(() => { setCached({}); setPhase("idle"); }); }}>{L.clearCache}</button>
      </details>
    </div>
  );
}
