import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize, MonitorPlay, MousePointer2, X } from "lucide-react";
import { SLIDE_H, SLIDE_W, type SlideItem, type SlidesFile } from "./model";
import type { Tx } from "./names";
import { SlideView } from "./SlideView";

function useViewport(win: Window | null) {
  const [size, setSize] = useState(() => ({ w: (win ?? window).innerWidth, h: (win ?? window).innerHeight }));
  useEffect(() => {
    const target = win ?? window;
    const on = () => setSize({ w: target.innerWidth, h: target.innerHeight });
    on();
    target.addEventListener("resize", on);
    return () => target.removeEventListener("resize", on);
  }, [win]);
  return size;
}

function animatedOf(items: SlideItem[]): string[] {
  return items.filter((i) => i.anim).map((i) => i.id);
}

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(r).padStart(2, "0")}`;
}

/** Presentación a pantalla completa, con transiciones, animaciones al hacer clic, puntero láser y vista del presentador. */
export function Presenter({ file, start, presenter, tx, onExit }: { file: SlidesFile; start: number; presenter: boolean; tx: Tx; onExit: (at?: number) => void }) {
  const order = useMemo(() => {
    const list = file.slides.map((s, i) => (s.hidden && i !== start ? -1 : i)).filter((i) => i >= 0);
    return list.length > 0 ? list : [0];
  }, [file.slides, start]);
  const [pos, setPos] = useState(() => Math.max(0, order.indexOf(start)));
  const [step, setStep] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [laser, setLaser] = useState(false);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [bar, setBar] = useState(true);
  const [blank, setBlank] = useState<null | "black" | "white">(null);
  const [typed, setTyped] = useState("");
  const [popup, setPopup] = useState<Window | null>(null);
  const [inline, setInline] = useState(false);
  const [startAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const wasFull = useRef(false);
  const barTimer = useRef(0);
  const viewport = useViewport(null);

  const index = order[pos] ?? 0;
  const slide = file.slides[index] ?? file.slides[0]!;
  const anims = animatedOf(slide.items);
  const nextIndex = order[pos + 1];

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    popup?.close();
    onExit(index);
  }, [index, onExit, popup]);

  const goSlide = useCallback((nextPos: number, toEnd = false) => {
    const clamped = Math.max(0, Math.min(order.length - 1, nextPos));
    if (clamped === pos) return;
    setDir(clamped > pos ? 1 : -1);
    setPrev(index);
    setPos(clamped);
    const target = file.slides[order[clamped] ?? 0];
    setStep(toEnd && target ? animatedOf(target.items).length : 0);
  }, [order, pos, index, file.slides]);

  const next = useCallback(() => {
    setBlank(null);
    if (step < anims.length) { setStep((s) => s + 1); return; }
    if (pos >= order.length - 1) { exit(); return; }
    goSlide(pos + 1);
  }, [step, anims.length, pos, order.length, goSlide, exit]);

  const back = useCallback(() => {
    setBlank(null);
    if (step > 0) { setStep((s) => s - 1); return; }
    goSlide(pos - 1, true);
  }, [step, pos, goSlide]);

  /* pantalla completa real */
  useEffect(() => {
    const el = rootRef.current;
    if (!presenter && el?.requestFullscreen) {
      el.requestFullscreen().then(() => { wasFull.current = true; }).catch(() => undefined);
    }
    const onChange = () => { if (wasFull.current && !document.fullscreenElement) { wasFull.current = false; onExit(order[pos] ?? 0); } };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* vista del presentador: ventana aparte (o en la misma si el navegador la bloquea) */
  useEffect(() => {
    if (!presenter) return;
    const win = window.open("", `orvupi-presenter-${file.id}`, "popup=yes,width=1100,height=720");
    if (!win) { setInline(true); return; }
    win.document.title = `${tx("Vista del presentador", "Presenter view")} · ${file.title}`;
    win.document.documentElement.lang = document.documentElement.lang;
    for (const node of [...document.querySelectorAll('link[rel="stylesheet"], style')]) win.document.head.appendChild(node.cloneNode(true));
    win.document.body.className = "sl-pv-body";
    setPopup(win);
    const closed = window.setInterval(() => { if (win.closed) { window.clearInterval(closed); setPopup(null); } }, 800);
    return () => { window.clearInterval(closed); win.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenter]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), (slide.duration ?? 0.6) * 1000 + 60);
    return () => window.clearTimeout(t);
  }, [prev, slide.duration]);

  /* teclado (también desde la ventana del presentador) */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const k = event.key;
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "n", "N"].includes(k) || (k === "Enter" && !typed)) { event.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p", "P"].includes(k)) { event.preventDefault(); back(); }
      else if (k === "Home") { event.preventDefault(); goSlide(0); }
      else if (k === "End") { event.preventDefault(); goSlide(order.length - 1); }
      else if (k === "Escape") { event.preventDefault(); exit(); }
      else if (k === "b" || k === "B" || k === ".") setBlank((b) => (b === "black" ? null : "black"));
      else if (k === "w" || k === "W" || k === ",") setBlank((b) => (b === "white" ? null : "white"));
      else if (k === "l" || k === "L") setLaser((v) => !v);
      else if (/^\d$/.test(k)) setTyped((t) => (t + k).slice(-3));
      else if (k === "Enter" && typed) { const n = Number(typed) - 1; const p = order.indexOf(n); if (p >= 0) goSlide(p); setTyped(""); }
    };
    window.addEventListener("keydown", onKey);
    popup?.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); popup?.removeEventListener("keydown", onKey); };
  }, [next, back, goSlide, exit, order, typed, popup]);

  const fit = Math.min(viewport.w / SLIDE_W, viewport.h / SLIDE_H);
  const showInline = presenter && inline;
  const mainScale = showInline ? Math.min((viewport.w * 0.62) / SLIDE_W, (viewport.h - 120) / SLIDE_H) : fit;
  const revealed = new Set(anims.slice(0, step));
  const hidden = anims.filter((id) => !revealed.has(id));
  const lastRevealed = step > 0 ? anims[step - 1] : undefined;
  const transition = slide.transition && slide.transition !== "none" ? slide.transition : null;
  const duration = slide.duration ?? 0.6;

  const onLink = (event: React.MouseEvent) => {
    const a = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-link]");
    if (!a) return false;
    const link = a.dataset.link ?? "";
    if (link.startsWith("#slide=")) {
      event.preventDefault();
      const n = Number(link.slice(7)) - 1;
      const p = order.indexOf(n);
      if (p >= 0) goSlide(p);
    }
    return true;
  };

  const stage = (
    <div
      className="sl-present-stage"
      style={{ width: SLIDE_W * mainScale, height: SLIDE_H * mainScale, ["--sl-dur" as string]: `${duration}s` }}
      onClick={(e) => { if (onLink(e)) return; if ((e.target as HTMLElement).closest("video, iframe")) return; next(); }}
      onPointerMove={(e) => {
        if (!laser) return;
        const r = e.currentTarget.getBoundingClientRect();
        setDot({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onPointerLeave={() => setDot(null)}
    >
      {prev !== null && transition && file.slides[prev] ? (
        <div className={`sl-tr-layer is-out sl-tr-${transition}${dir < 0 ? " is-back" : ""}`} key={`out-${prev}`}>
          <SlideView slide={file.slides[prev]!} scale={mainScale} number={file.numbers ? prev + 1 : undefined} master={file.master} />
        </div>
      ) : null}
      <div className={`sl-tr-layer is-in${prev !== null && transition ? ` sl-tr-${transition}${dir < 0 ? " is-back" : ""}` : ""}`} key={`in-${index}`}>
        <SlideView
          slide={slide}
          scale={mainScale}
          live
          hidden={hidden}
          number={file.numbers ? index + 1 : undefined}
          master={file.master}
          animClass={(item) => (item.id === lastRevealed && item.anim ? `sl-anim-in sl-anim-${item.anim}` : undefined)}
        />
      </div>
      {blank ? <div className={`sl-blank is-${blank}`} /> : null}
      {laser && dot ? <span className="sl-laser ow-laser" style={{ left: dot.x, top: dot.y }} aria-hidden="true" /> : null}
    </div>
  );

  const controls = (
    <div className={`sl-present-bar${bar ? " is-on" : ""}`} role="toolbar" aria-label={tx("Controles de la presentación", "Presentation controls")}>
      <button type="button" aria-label={tx("Anterior", "Previous")} onClick={back}><ChevronLeft size={20} /></button>
      <span className="sl-present-count" role="status">{tx("Diapositiva", "Slide")} {index + 1} / {file.slides.length}</span>
      <button type="button" aria-label={tx("Siguiente", "Next")} onClick={next}><ChevronRight size={20} /></button>
      <button type="button" aria-label={tx("Puntero láser", "Laser pointer")} aria-pressed={laser} onClick={() => setLaser((v) => !v)}><MousePointer2 size={18} /></button>
      {!presenter ? <button type="button" aria-label={tx("Abrir la vista del presentador", "Open presenter view")} onClick={() => onExit(-1 - index)}><MonitorPlay size={18} /></button> : null}
      <button type="button" aria-label={tx("Pantalla completa", "Full screen")} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void rootRef.current?.requestFullscreen?.().then(() => { wasFull.current = true; }).catch(() => undefined); }}><Maximize size={18} /></button>
      <button type="button" aria-label={tx("Salir de la presentación", "Exit presentation")} onClick={exit}><X size={18} /></button>
    </div>
  );

  const presenterView = (win: Window | null): ReactNode => {
    const nextSlide = nextIndex !== undefined ? file.slides[nextIndex] : undefined;
    const w = win ? win.innerWidth : viewport.w;
    const currentScale = Math.min(((win ? w * 0.56 : w * 0.34) - 24) / SLIDE_W, 0.7);
    return (
      <div className={`sl-pv${win ? " is-window" : " is-inline"}`} role="region" aria-label={tx("Vista del presentador", "Presenter view")}>
        <header className="sl-pv-head">
          <strong>{tx("Vista del presentador", "Presenter view")}</strong>
          <span className="sl-pv-timer" role="timer" aria-label={tx("Tiempo transcurrido", "Elapsed time")}>{clock(now - startAt)}</span>
          <span>{tx("Diapositiva", "Slide")} {index + 1} / {file.slides.length}</span>
        </header>
        <div className="sl-pv-main">
          {win ? (
            <div className="sl-pv-current">
              <span>{tx("Ahora", "Now")}</span>
              <SlideView slide={slide} scale={currentScale} hidden={hidden} />
            </div>
          ) : null}
          <div className="sl-pv-side">
            <div className="sl-pv-next">
              <span>{tx("Siguiente", "Next")}</span>
              {step < anims.length ? <p className="sl-pv-note">{tx("Queda una animación en esta diapositiva", "One more animation on this slide")}</p> : nextSlide ? <SlideView slide={nextSlide} scale={win ? 0.3 : 0.26} /> : <p className="sl-pv-note">{tx("Fin de la presentación", "End of presentation")}</p>}
            </div>
            <div className="sl-pv-notes">
              <span>{tx("Notas del orador", "Speaker notes")}</span>
              <p>{slide.notes?.trim() || tx("Esta diapositiva no tiene notas.", "This slide has no notes.")}</p>
            </div>
          </div>
        </div>
        <footer className="sl-pv-foot">
          <button type="button" onClick={back}>{tx("Anterior", "Previous")}</button>
          <button type="button" className="is-primary" onClick={next}>{tx("Siguiente", "Next")}</button>
          <button type="button" onClick={exit}>{tx("Finalizar", "End")}</button>
        </footer>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`sl-present-root${showInline ? " is-split" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${tx("Presentación", "Presentation")}: ${file.title}`}
      onPointerMove={() => { setBar(true); window.clearTimeout(barTimer.current); barTimer.current = window.setTimeout(() => setBar(false), 2600); }}
    >
      <div className="sl-present-center">{stage}</div>
      {showInline ? presenterView(null) : null}
      {controls}
      {popup ? createPortal(presenterView(popup), popup.document.body) : null}
    </div>
  );
}
