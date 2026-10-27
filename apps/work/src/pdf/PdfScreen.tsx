import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Hand, Maximize2, MessageSquarePlus, Minus, MousePointer2, PanelLeft, Plus, Printer } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { downloadBytes } from "../security/bytes";
import { fileNameWithExtension, formatBytes } from "../security/names";
import type { FileRecord } from "../storage/types";
import { useWorkspace } from "../app/workspace";
import { MenuBar, type BarItem } from "../ui/menus";
import { Button } from "../ui/kit";
import { openPdfDocument, pageSize, pageText, paintPage, paintThumb, readOutline, type PdfOutline } from "./engine";
import { anchorOnPage, pageBoxInScroller, scrollToAnchor, type ZoomAnchor } from "./zoomAnchor";
import "./pdf.css";

const ZOOMS = [50, 75, 100, 125, 150, 200];

function mark(active: boolean, label: string): string {
  return active ? `✓ ${label}` : label;
}

export function PdfScreen() {
  const workspace = useWorkspace();
  const { t, openPdfId, files } = workspace;
  const record = files.find((file) => file.id === openPdfId && file.deletedAt === null && file.kind === "pdf") ?? null;
  if (!openPdfId || !record) {
    const pdfs = files.filter((file) => file.deletedAt === null && file.kind === "pdf");
    return (
      <div className="ow-page ow-pdf-library">
        <h1>{t("laterPdfTitle")}</h1>
        <p>{t("pdfOpenHint")}</p>
        {pdfs.length === 0 ? <p>{t("noPdf")}</p> : (
          <div className="ow-list">
            {pdfs.map((file) => (
              <Button key={file.id} onClick={() => workspace.openPdf(file.id)}>{file.name}</Button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return <PdfViewer key={record.id} record={record} />;
}

function PdfViewer({ record }: { record: FileRecord }) {
  const workspace = useWorkspace();
  const { t, storage, reportError, pushToast, refreshFiles } = workspace;
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [base, setBase] = useState<Array<{ width: number; height: number }>>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [showSide, setShowSide] = useState(true);
  const [side, setSide] = useState<"thumbs" | "outline">("thumbs");
  const [outline, setOutline] = useState<PdfOutline[]>([]);
  const [comments, setComments] = useState<"hide" | "show" | "all">("hide");
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<number[]>([]);
  const [hitAt, setHitAt] = useState(0);
  const [name, setName] = useState(record.name);
  const [favorite, setFavorite] = useState(record.favorite);
  const [commentNote, setCommentNote] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const anchorRef = useRef<ZoomAnchor | null>(null);
  const ignoreScroll = useRef(0);
  const sawFit = useRef(false);
  const queuedScale = useRef<number | null>(null);
  const scaleRef = useRef(scale);
  const pageRef = useRef(page);
  scaleRef.current = scale;
  pageRef.current = page;

  useEffect(() => {
    if (!storage) return;
    let cancel = false;
    setError(false);
    setDoc(null);
    void storage.exportFile(record.id).then(async (exported) => {
      if (cancel) return;
      bytesRef.current = exported.bytes;
      try {
        const opened = await openPdfDocument(exported.bytes);
        if (cancel) {
          await opened.destroy();
          return;
        }
        const sizes = [];
        for (let index = 1; index <= opened.numPages; index += 1) sizes.push(await pageSize(opened, index));
        if (cancel) return;
        setBase(sizes);
        setDoc(opened);
        const drawn: string[] = [];
        for (let index = 1; index <= opened.numPages; index += 1) {
          drawn.push(await paintThumb(opened, index));
          if (!cancel && index % 2 === 0) setThumbs([...drawn]);
        }
        if (!cancel) setThumbs(drawn);
        const tree = await readOutline(opened);
        if (!cancel) setOutline(tree);
      } catch {
        if (!cancel) setError(true);
      }
    }).catch((cause: unknown) => {
      if (!cancel) reportError(cause);
    });
    return () => {
      cancel = true;
    };
  }, [record.id, storage, reportError]);

  useEffect(() => () => {
    void doc?.destroy();
  }, [doc]);

  function holdView() {
    const root = scrollRef.current;
    if (!root) return;
    const pages = [...root.querySelectorAll<HTMLElement>("[data-pdf-page]")].map((node) => ({
      page: Number(node.dataset.pdfPage),
      ...pageBoxInScroller(root, node),
    }));
    anchorRef.current = anchorOnPage(
      pages,
      root.scrollLeft + root.clientWidth / 2,
      root.scrollTop + root.clientHeight / 2,
      pageRef.current,
    );
  }

  useEffect(() => {
    if (!fit) return;
    const stage = stageRef.current;
    const width = base[0]?.width ?? 0;
    if (!stage || width <= 0) return;
    const apply = () => {
      const available = Math.max(160, stage.clientWidth - 96);
      const next = Math.min(4, Math.max(0.25, available / width));
      if (queuedScale.current !== null && Math.abs(queuedScale.current - next) < 0.0001) return;
      if (Math.abs(scaleRef.current - next) < 0.0001) {
        queuedScale.current = null;
        sawFit.current = true;
        return;
      }
      if (sawFit.current) holdView();
      queuedScale.current = next;
      sawFit.current = true;
      setScale(next);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fit, base, showSide]);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (queuedScale.current !== null && Math.abs(queuedScale.current - scale) < 0.0001) queuedScale.current = null;
    if (!root || !anchor) return;
    const node = root.querySelector<HTMLElement>(`[data-pdf-page="${anchor.page}"]`);
    if (!node) return;
    const next = scrollToAnchor(
      pageBoxInScroller(root, node),
      anchor,
      { width: root.clientWidth, height: root.clientHeight },
      { left: root.scrollWidth - root.clientWidth, top: root.scrollHeight - root.clientHeight },
    );
    ignoreScroll.current += 1;
    root.scrollLeft = next.scrollLeft;
    root.scrollTop = next.scrollTop;
    setPage(anchor.page);
    requestAnimationFrame(() => {
      ignoreScroll.current = Math.max(0, ignoreScroll.current - 1);
    });
  }, [scale]);

  function go(next: number) {
    if (!doc) return;
    const target = Math.min(doc.numPages, Math.max(1, next));
    setPage(target);
    scrollRef.current?.querySelector<HTMLElement>(`[data-pdf-page="${target}"]`)?.scrollIntoView({ block: "start" });
  }

  function onScroll() {
    if (ignoreScroll.current > 0) return;
    const root = scrollRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top;
    let current = 1;
    for (const node of root.querySelectorAll<HTMLElement>("[data-pdf-page]")) {
      if (node.getBoundingClientRect().top - rootTop <= root.clientHeight * 0.35) current = Number(node.dataset.pdfPage);
    }
    setPage(current);
  }

  useEffect(() => {
    rootRef.current?.querySelector(".ow-pdf-side [aria-current='true']")?.scrollIntoView({ block: "nearest" });
  }, [page]);

  function setZoom(next: number, fitting = false) {
    if (!fitting) {
      const clamped = Math.min(4, Math.max(0.25, next));
      if (Math.abs(clamped - scaleRef.current) > 0.0001) holdView();
      setScale(clamped);
    }
    setFit(fitting);
    setZoomOpen(false);
  }

  function downloadPdf() {
    const data = bytesRef.current;
    if (!data) return;
    downloadBytes(data, fileNameWithExtension(name, "pdf"), "application/pdf");
  }

  function printPdf() {
    const data = bytesRef.current;
    if (!data) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "application/pdf" }));
    const popup = window.open(url);
    if (!popup) {
      URL.revokeObjectURL(url);
      window.print();
      return;
    }
    popup.addEventListener("load", () => popup.print());
  }

  async function commitName() {
    if (!storage) return;
    const next = name.trim();
    if (!next || next === record.name) {
      setName(record.name);
      return;
    }
    try {
      const saved = await storage.renameFile(record.id, next);
      setName(saved.name);
      await refreshFiles();
    } catch (cause) {
      setName(record.name);
      reportError(cause);
    }
  }

  async function toggleStar() {
    if (!storage) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await storage.setFavorite(record.id, next);
      await refreshFiles();
    } catch (cause) {
      setFavorite(!next);
      reportError(cause);
    }
  }

  async function runFind(value = query) {
    if (!doc) return;
    const needle = value.trim().toLowerCase();
    if (!needle) {
      setHits([]);
      return;
    }
    const found: number[] = [];
    for (let index = 1; index <= doc.numPages; index += 1) {
      const text = (await pageText(doc, index)).toLowerCase();
      if (text.includes(needle)) found.push(index);
    }
    setHits(found);
    setHitAt(0);
    if (found[0]) go(found[0]);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        printPdf();
        return;
      }
      if (typing) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") go(page + 1);
      if (event.key === "ArrowUp" || event.key === "PageUp") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const soon = () => pushToast(t("pdfSoon"));
  const percent = `${Math.round(scale * 100)} %`;
  const total = doc?.numPages ?? base.length;
  const fileItems: BarItem[] = [
    { id: "share", label: t("pdfShare"), children: [
      { id: "share2", label: t("pdfShare"), onSelect: soon },
      { id: "link", label: t("pdfCopyLink"), onSelect: soon },
      { id: "mail", label: t("pdfSendEmail"), onSelect: soon },
    ] },
    { id: "download", label: t("download"), onSelect: downloadPdf },
    { id: "rename", label: t("pdfRename"), onSelect: () => nameRef.current?.focus() },
    { id: "move", label: t("pdfMove"), onSelect: soon },
    { id: "star", label: favorite ? t("pdfStarRemove") : t("pdfStarAdd"), onSelect: () => void toggleStar() },
    { id: "details", label: t("details"), children: [
      { id: "dname", label: name, static: true },
      { id: "dpages", label: t("pdfPages", { total: total || "—" }), static: true },
      { id: "dsize", label: formatBytes(record.size, workspace.locale), static: true },
    ] },
    { id: "secure", label: t("pdfSecurity"), children: [
      { id: "local", label: t("pdfLocalOnly"), static: true },
    ] },
    { id: "print", label: t("print"), hint: "Ctrl+P", onSelect: printPdf },
  ];
  const viewItems: BarItem[] = [
    { id: "show", label: t("pdfShow"), children: [
      { id: "thumbs", label: mark(showSide && side === "thumbs", t("pdfThumbs")), onSelect: () => { setShowSide(true); setSide("thumbs"); } },
      { id: "outline", label: mark(showSide && side === "outline", t("pdfOutline")), onSelect: () => { setShowSide(true); setSide("outline"); } },
    ] },
    { id: "comments", label: t("pdfComments"), children: [
      { id: "hide", label: mark(comments === "hide", t("pdfHideComments")), onSelect: () => setComments("hide") },
      { id: "showc", label: mark(comments === "show", t("pdfShowComments")), onSelect: () => setComments("show") },
      { id: "all", label: mark(comments === "all", t("pdfShowAllComments")), onSelect: () => setComments("all") },
    ] },
    { id: "zoom", label: t("zoomLabel"), children: [
      { id: "fit", label: mark(fit, t("pdfFit")), onSelect: () => setZoom(1, true) },
      ...ZOOMS.map((value) => ({ id: String(value), label: mark(!fit && Math.round(scale * 100) === value, `${value} %`), onSelect: () => setZoom(value / 100) })),
    ] },
  ];

  return (
    <div className={`ow-pdf${tool === "hand" ? " is-hand" : ""}`} data-tool="pdf" ref={rootRef}>
      <header className="ow-pdf-chrome">
        <div className="ow-pdf-title">
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfBack")} onClick={() => workspace.closePdf()}>
            <ChevronLeft />
          </button>
          <input
            ref={nameRef}
            className="ow-pdf-name"
            aria-label={t("fileName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          />
        </div>
        <MenuBar
          label={t("menuBar")}
          menus={[
            { id: "file", label: t("menuFile"), items: fileItems },
            { id: "view", label: t("pdfVisualize"), items: viewItems },
            { id: "insert", label: t("menuInsert"), items: [
              { id: "comment", label: t("pdfCommentAdd"), onSelect: () => { setComments("show"); setCommentNote(t("pdfSoon")); } },
            ] },
            { id: "tools", label: t("menuTools"), items: [
              { id: "find", label: t("find"), hint: "Ctrl+F", onSelect: () => setFindOpen(true) },
              { id: "notes", label: t("pdfNotifications"), onSelect: soon },
            ] },
            { id: "help", label: t("menuHelp"), items: [
              { id: "keys", label: t("shortcuts"), children: [
                { id: "k1", label: "Ctrl+F", static: true },
                { id: "k2", label: "Ctrl+P", static: true },
              ] },
              { id: "ver", label: "ORVUPI Work", static: true },
            ] },
          ]}
        />
        <div className="ow-pdf-toolbar" role="toolbar" aria-label={t("toolbarLabel")}>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfSidebar")} aria-pressed={showSide} onClick={() => setShowSide((value) => !value)}>
            <PanelLeft />
          </button>
          <span className="ow-pdf-page">{t("pdfPageLabel", { page, total: total || "—" })}</span>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfPrev")} disabled={page <= 1} onClick={() => go(page - 1)}><ChevronUp /></button>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfNext")} disabled={!total || page >= total} onClick={() => go(page + 1)}><ChevronDown /></button>
          <i className="ow-pdf-sep" />
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfSelect")} aria-pressed={tool === "select"} onClick={() => setTool("select")}><MousePointer2 /></button>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfHand")} aria-pressed={tool === "hand"} onClick={() => setTool("hand")}><Hand /></button>
          <i className="ow-pdf-sep" />
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfZoomOut")} onClick={() => setZoom(scale / 1.1)}><Minus /></button>
          <div className="ow-pdf-zoom">
            <button type="button" className="ow-pdf-zoompct" aria-haspopup="menu" aria-expanded={zoomOpen} onClick={() => setZoomOpen((value) => !value)}>
              {percent} ▾
            </button>
            {zoomOpen ? (
              <div className="ow-pdf-zoommenu" role="menu" aria-label={t("zoomLabel")}>
                <button type="button" role="menuitem" aria-current={fit} onClick={() => setZoom(1, true)}>{t("pdfFit")}</button>
                {ZOOMS.map((value) => (
                  <button key={value} type="button" role="menuitem" aria-current={!fit && Math.round(scale * 100) === value} onClick={() => setZoom(value / 100)}>{value} %</button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfZoomIn")} onClick={() => setZoom(scale * 1.1)}><Plus /></button>
          <button type="button" className="ow-pdf-icon" aria-label={t("pdfFit")} aria-pressed={fit} onClick={() => setZoom(1, true)}><Maximize2 /></button>
          <i className="ow-pdf-sep" />
          <button type="button" className="ow-pdf-textbtn" onClick={() => { setComments("show"); setCommentNote(t("pdfSoon")); }}>
            <MessageSquarePlus /> {t("pdfCommentBtn")}
          </button>
          <span className="ow-pdf-grow" />
          <button type="button" className="ow-pdf-icon" aria-label={t("print")} onClick={printPdf}><Printer /></button>
          <button type="button" className="ow-pdf-icon" aria-label={t("download")} onClick={downloadPdf}><Download /></button>
        </div>
        {findOpen ? (
          <form className="ow-pdf-find" onSubmit={(event) => { event.preventDefault(); void runFind(); }}>
            <input aria-label={t("find")} value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="submit" className="ow-pdf-textbtn">{t("find")}</button>
            <button type="button" className="ow-pdf-textbtn" onClick={() => { if (hits.length === 0) return; const next = (hitAt + 1) % hits.length; setHitAt(next); go(hits[next] ?? 1); }}>{t("pdfFindNext")}</button>
            <span>{hits.length === 0 && query.trim() ? t("pdfFindNone") : hits.length ? `${hitAt + 1}/${hits.length}` : ""}</span>
            <button type="button" className="ow-pdf-icon" aria-label={t("pdfBack")} onClick={() => setFindOpen(false)}><ChevronLeft /></button>
          </form>
        ) : null}
      </header>
      <div className="ow-pdf-body">
        {showSide ? (
          <aside className="ow-pdf-side" aria-label={side === "thumbs" ? t("pdfThumbs") : t("pdfOutline")}>
            {side === "thumbs" ? thumbs.map((src, index) => (
              <button key={index + 1} type="button" className="ow-pdf-thumb" aria-current={page === index + 1} aria-label={t("pdfPageLabel", { page: index + 1, total })} onClick={() => go(index + 1)}>
                {src ? <img src={src} alt="" /> : <span className="ow-pdf-ph" />}
                <small>{index + 1}</small>
              </button>
            )) : outline.length === 0 ? <p>{t("pdfNoOutline")}</p> : <OutlineList nodes={outline} onOpen={go} />}
          </aside>
        ) : null}
        <div
          className="ow-pdf-stage"
          ref={stageRef}
          onPointerDown={(event) => {
            if (tool !== "hand" || !scrollRef.current) return;
            drag.current = { x: event.clientX, y: event.clientY, left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || !scrollRef.current) return;
            scrollRef.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
            scrollRef.current.scrollTop = drag.current.top - (event.clientY - drag.current.y);
          }}
          onPointerUp={() => { drag.current = null; }}
        >
          <button type="button" className="ow-pdf-float prev" aria-label={t("pdfPrev")} disabled={page <= 1} onClick={() => go(page - 1)}><ChevronLeft /></button>
          <button type="button" className="ow-pdf-float next" aria-label={t("pdfNext")} disabled={!total || page >= total} onClick={() => go(page + 1)}><ChevronRight /></button>
          <div className="ow-pdf-scroll" ref={scrollRef} onScroll={onScroll}>
            {error ? <p className="ow-pdf-status">{t("pdfOpenFail")}</p> : null}
            {!doc && !error ? <p className="ow-pdf-status">{t("pdfLoading")}</p> : null}
            {doc ? (
              <div className="ow-pdf-column">
                {base.map((size, index) => (
                  <PdfPage key={index + 1} doc={doc} pageNumber={index + 1} scale={scale} width={size.width * scale} height={size.height * scale} label={t("pdfPageLabel", { page: index + 1, total })} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {comments !== "hide" ? (
          <aside className="ow-pdf-comments" aria-label={t("pdfComments")}>
            <h2>{t("pdfComments")}</h2>
            <p>{commentNote || t("pdfNoComments")}</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function OutlineList({ nodes, onOpen }: { nodes: PdfOutline[]; onOpen: (page: number) => void }) {
  return (
    <ul className="ow-pdf-outline">
      {nodes.map((node, index) => (
        <li key={`${node.title}-${index}`}>
          <button type="button" onClick={() => { if (node.page) onOpen(node.page); }}>{node.title}</button>
          {node.items.length > 0 ? <OutlineList nodes={node.items} onOpen={onOpen} /> : null}
        </li>
      ))}
    </ul>
  );
}

function PdfPage({ doc, pageNumber, scale, width, height, label }: { doc: PDFDocumentProxy; pageNumber: number; scale: number; width: number; height: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const node = wrap.current;
    if (!canvas || !node) return;
    let cancel = false;
    let taskPage: PDFPageProxy | null = null;
    const paint = async () => {
      const page = await doc.getPage(pageNumber);
      taskPage = page;
      if (cancel) return;
      await paintPage(page, canvas, scale);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void paint();
    }, { rootMargin: "800px" });
    observer.observe(node);
    return () => {
      cancel = true;
      observer.disconnect();
      void taskPage?.cleanup();
    };
  }, [doc, pageNumber, scale]);
  return (
    <div className="ow-pdf-sheet" data-pdf-page={pageNumber} ref={wrap} style={{ width, height }}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  );
}
