import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { downloadBytes } from "../security/bytes";
import { fileNameWithExtension } from "../security/names";
import { Button, Input, Select } from "../ui/kit";
import { absentOnDevice, MissingFile } from "../ui/MissingFile";
import { MenuBar } from "../ui/menus";
import {
  SLIDE_FILLS,
  SLIDE_THEMES,
  alignItem,
  defaultItems,
  layoutItems,
  orderItems,
  parseSlides,
  serializeSlides,
  syncSlideText,
  type Slide,
  type SlideItem,
  type SlideLayout,
  type SlideTheme,
  type SlidesFile,
} from "./model";
import { slidesToPdf } from "./pdf";

const CANVAS_W = 816;
const CANVAS_H = 459;

const THEME_KEY: Record<SlideTheme, "themePaper" | "themeInk" | "themeGrove" | "themeRose"> = {
  papel: "themePaper",
  tinta: "themeInk",
  bosque: "themeGrove",
  rosa: "themeRose",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inkFor(fill: string): string {
  return fill === "#102032" || fill === "#0b5d36" || fill === "#1d4e89" ? "#fff8ec" : "#102032";
}

function blankSlide(): Slide {
  return { title: "", body: "", theme: "papel", items: defaultItems("", ""), notes: "", transition: "none", layout: "title-body" };
}

export function SlidesScreen() {
  const workspace = useWorkspace();
  const decks = workspace.files.filter((file) => file.deletedAt === null && file.kind === "slide");
  const [file, setFile] = useState<SlidesFile | null>(null);
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [selectedId, setSelectedId] = useState<string | null>("title");
  const [help, setHelp] = useState(false);
  const [grid, setGrid] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!workspace.openSlideId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openSlideId;
    let cancel = false;
    loadFileWhenReady(workspace.storage, id).then((loaded) => {
      if (cancel || loaded.integrity === "mismatch") return;
      setFile(parseSlides(loaded.bytes));
      setIndex(0);
      setSelectedId("title");
      setStatus("saved");
    }).catch(workspace.reportError);
    return () => {
      cancel = true;
    };
  }, [workspace.openSlideId, workspace.storage, workspace.reportError]);

  useEffect(() => {
    if (!file || !workspace.storage || status !== "pending") return;
    const timer = window.setTimeout(() => {
      void workspace.storage?.saveFile({
        id: file.id,
        name: file.title,
        kind: "slide",
        mime: "application/vnd.orvupi.slides+json",
        bytes: serializeSlides(file),
      }).then(() => workspace.refreshFiles()).then(() => setStatus("saved")).catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  useEffect(() => {
    if (!present || !file) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
        event.preventDefault();
        setIndex((value) => Math.min(file.slides.length - 1, value + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      } else if (event.key === "Escape") setPresent(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, file]);

  function update(next: SlidesFile) {
    setFile(next);
    setStatus("pending");
  }

  function patchCurrent(mutator: (slide: Slide) => Slide) {
    if (!file) return;
    const slides = file.slides.map((slide, itemIndex) => (itemIndex === index ? syncSlideText(mutator(slide)) : slide));
    update({ ...file, slides });
  }

  function addItem(item: SlideItem) {
    patchCurrent((slide) => (slide.items.length >= 24 ? slide : { ...slide, items: [...slide.items, item] }));
    setSelectedId(item.id);
  }

  function startDrag(event: ReactPointerEvent, item: SlideItem) {
    if (present) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = item.x;
    const originY = item.y;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setFile((current) => {
        if (!current) return current;
        const slides = current.slides.map((slide, itemIndex) => {
          if (itemIndex !== index) return slide;
          const items = slide.items.map((entry) => (
            entry.id === item.id
              ? { ...entry, x: clamp(originX + dx, 0, CANVAS_W - 40), y: clamp(originY + dy, 0, CANVAS_H - 28) }
              : entry
          ));
          return syncSlideText({ ...slide, items });
        });
        return { ...current, slides };
      });
      setStatus("pending");
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  if (!workspace.openSlideId) {
    return (
      <div className="ow-page" data-tool="slides">
        <h1>{workspace.t("navSlides")}</h1>
        <p>{workspace.t("slideHint")}</p>
        <Button variant="primary" onClick={() => void workspace.createSlides(null)}>{workspace.t("newSlides")}</Button>
        <div className="ow-list">
          {decks.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openSlide(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (absentOnDevice(workspace.ready, workspace.openSlideId, workspace.files)) {
    return <MissingFile message={workspace.t("fileMissing")} action={workspace.t("backToDrive")} onBack={() => void workspace.showBrowse("folder")} />;
  }

  if (!file) return <p>{workspace.t("preparing")}</p>;
  const slide = file.slides[index] ?? file.slides[0];
  if (!slide) return null;
  const selected = slide.items.find((item) => item.id === selectedId) ?? null;

  function renderItem(item: SlideItem, interactive: boolean) {
    const shape = item.kind === "shape";
    const label = item.kind === "text" ? (item.text.trim() || workspace.t("slideText")) : item.kind === "image" ? workspace.t("slideImage") : item.kind === "line" ? workspace.t("slideLine") : workspace.t("slideShape");
    return (
      <button
        key={item.id}
        type="button"
        className={`ow-slide-item${selectedId === item.id ? " is-selected" : ""}${item.anim ? ` ow-anim-${item.anim}` : ""}`}
        aria-label={label}
        aria-pressed={selectedId === item.id}
        style={{
          left: `${(item.x / CANVAS_W) * 100}%`,
          top: `${(item.y / CANVAS_H) * 100}%`,
          width: `${(item.w / CANVAS_W) * 100}%`,
          height: `${(item.h / CANVAS_H) * 100}%`,
          background: shape ? item.fill : item.kind === "text" ? item.fill : "transparent",
          color: shape ? inkFor(item.fill) : item.kind === "text" ? item.color : undefined,
          borderRadius: shape && item.shape === "ellipse" ? "50%" : undefined,
          fontWeight: item.kind === "text" && item.bold ? 800 : undefined,
          fontStyle: item.kind === "text" && item.italic ? "italic" : undefined,
          textAlign: item.kind === "text" ? item.align : undefined,
          fontSize: item.kind === "text" && item.size ? item.size : undefined,
          pointerEvents: interactive ? "auto" : "none",
        }}
        onPointerDown={interactive ? (event) => startDrag(event, item) : undefined}
      >
        {item.kind === "text" ? item.text : null}
        {item.kind === "image" ? <img src={item.src} alt="" /> : null}
        {item.kind === "line" ? <svg className="ow-slide-line" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="10" x2="100" y2="10" stroke="#102032" strokeWidth="4" /></svg> : null}
      </button>
    );
  }

  if (present) {
    return (
      <section className={`ow-stage ow-present ow-theme-${slide.theme}`} aria-label={file.title}>
        <p>{index + 1} / {file.slides.length}</p>
        <div className={`ow-slide-canvas ow-theme-${slide.theme} ow-trans-${slide.transition ?? "none"}`} style={{ background: slide.background }}>
          {slide.items.map((item) => renderItem(item, false))}
        </div>
        <div className="ow-row">
          <Button onClick={() => setIndex((value) => Math.max(0, value - 1))}>{workspace.t("slidePrev")}</Button>
          <Button onClick={() => setIndex((value) => Math.min(file.slides.length - 1, value + 1))}>{workspace.t("slideNext")}</Button>
          <Button onClick={() => setPresent(false)}>{workspace.t("slideExit")}</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="ow-page ow-slides-page" data-tool="slides">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-editor-line">
      <div className="ow-row">
        <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update({ ...file, title: event.target.value.slice(0, 180) })} />
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
        <Button variant="primary" onClick={() => setPresent(true)}>{workspace.t("slidePresent")}</Button>
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [
            { id: "present", label: workspace.t("slidePresent"), onSelect: () => setPresent(true) },
            { id: "pdf", label: workspace.t("slidePdf"), onSelect: () => void slidesToPdf(file).then((bytes) => downloadBytes(bytes, fileNameWithExtension(file.title, "pdf"), "application/pdf")).catch(workspace.reportError) },
          ] },
          { id: "edit", label: workspace.t("menuEdit"), items: [
            { id: "remove", label: workspace.t("slideRemove"), onSelect: () => {
              if (!selected || selected.id === "title" || selected.id === "body") return;
              patchCurrent((current) => ({ ...current, items: current.items.filter((item) => item.id !== selected.id) }));
              setSelectedId("title");
            } },
          ] },
          { id: "view", label: workspace.t("menuView"), items: [
            { id: "present", label: workspace.t("slidePresent"), onSelect: () => setPresent(true) },
            { id: "grid", label: workspace.t("slideGrid"), onSelect: () => setGrid((value) => !value) },
            { id: "master", label: workspace.t("slideMaster"), onSelect: () => update({ ...file, master: file.master ? "" : (slide.title || workspace.t("slideMaster")) }) },
          ] },
          { id: "insert", label: workspace.t("menuInsert"), items: [
            { id: "text", label: workspace.t("slideText"), onSelect: () => addItem({ id: crypto.randomUUID().slice(0, 12), kind: "text", x: 80, y: 80, w: 280, h: 80, text: workspace.t("slideText") }) },
            { id: "rect", label: workspace.t("shapeRect"), onSelect: () => addItem({ id: crypto.randomUUID().slice(0, 12), kind: "shape", shape: "rect", x: 120, y: 120, w: 180, h: 100, fill: "#ff3070" }) },
            { id: "ellipse", label: workspace.t("shapeEllipse"), onSelect: () => addItem({ id: crypto.randomUUID().slice(0, 12), kind: "shape", shape: "ellipse", x: 160, y: 160, w: 140, h: 140, fill: "#1d4e89" }) },
            { id: "image", label: workspace.t("slideImage"), onSelect: () => imageRef.current?.click() },
            { id: "line", label: workspace.t("slideLine"), onSelect: () => addItem({ id: crypto.randomUUID().slice(0, 12), kind: "line", x: 80, y: 220, w: 320, h: 12 }) },
          ] },
          { id: "format", label: workspace.t("menuFormat"), items: [
            ...SLIDE_THEMES.map((theme) => ({
              id: theme,
              label: workspace.t(THEME_KEY[theme]),
              onSelect: () => patchCurrent((current) => ({ ...current, theme })),
            })),
            { id: "bold", label: workspace.t("bold"), onSelect: () => patchCurrent((current) => ({ ...current, items: current.items.map((item) => item.id === selected?.id && item.kind === "text" ? { ...item, bold: !item.bold } : item) })) },
            { id: "italic", label: workspace.t("italic"), onSelect: () => patchCurrent((current) => ({ ...current, items: current.items.map((item) => item.id === selected?.id && item.kind === "text" ? { ...item, italic: !item.italic } : item) })) },
            { id: "paper", label: workspace.t("slideBackground"), onSelect: () => patchCurrent((current) => ({ ...current, background: current.background === "#fff0f5" ? "#fff8ec" : "#fff0f5" })) },
            { id: "fade", label: workspace.t("transFade"), onSelect: () => patchCurrent((current) => ({ ...current, transition: "fade" })) },
            { id: "move", label: workspace.t("transSlide"), onSelect: () => patchCurrent((current) => ({ ...current, transition: "slide" })) },
            { id: "anim", label: workspace.t("slideAnim"), onSelect: () => patchCurrent((current) => ({ ...current, items: current.items.map((item) => item.id === selected?.id ? { ...item, anim: item.anim === "fade" ? "pop" : "fade" } : item) })) },
            ...(["blank", "title", "title-body", "two"] as SlideLayout[]).map((layout) => ({
              id: layout,
              label: workspace.t(layout === "blank" ? "slideLayoutBlank" : layout === "title" ? "slideLayoutTitle" : layout === "two" ? "slideLayoutTwo" : "slideLayoutBody"),
              onSelect: () => patchCurrent((current) => ({ ...current, layout, items: layoutItems(layout, current.title, current.body) })),
            })),
          ] },
          { id: "tools", label: workspace.t("menuTools"), items: [
            { id: "center", label: workspace.t("alignCenter"), onSelect: () => {
              if (!selected) return;
              patchCurrent((current) => ({ ...current, items: current.items.map((item) => item.id === selected.id ? alignItem(item, CANVAS_W, CANVAS_H, "center") : item) }));
            } },
            { id: "dist", label: workspace.t("slideDistribute"), onSelect: () => patchCurrent((current) => {
              const gap = current.items.length > 1 ? (CANVAS_W - 80) / current.items.length : 0;
              return { ...current, items: current.items.map((item, itemIndex) => ({ ...item, x: 24 + itemIndex * gap })) };
            }) },
            { id: "front", label: workspace.t("slideFront"), onSelect: () => { if (selected) patchCurrent((current) => ({ ...current, items: orderItems(current.items, selected.id, "front") })); } },
            { id: "back", label: workspace.t("slideBack"), onSelect: () => { if (selected) patchCurrent((current) => ({ ...current, items: orderItems(current.items, selected.id, "back") })); } },
          ] },
          { id: "help", label: workspace.t("menuHelp"), items: [
            { id: "keys", label: workspace.t("shortcuts"), onSelect: () => setHelp(true) },
          ] },
        ]}
      />
      </div>
      {grid ? (
        <div className="ow-slide-grid" role="list">
          {file.slides.map((item, itemIndex) => (
            <button key={item.title + itemIndex} type="button" role="listitem" className={`ow-thumb ow-theme-${item.theme}`} onClick={() => { setIndex(itemIndex); setGrid(false); }}>
              {item.title || workspace.t("slideTitle")}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ow-slides-work">
        <aside className="ow-filmstrip" aria-label={workspace.t("navSlides")}>
          {file.slides.map((item, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              className={`ow-thumb ow-theme-${item.theme}`}
              aria-pressed={itemIndex === index}
              onClick={() => {
                setIndex(itemIndex);
                setSelectedId("title");
              }}
            >
              <span>{itemIndex + 1}</span>
              <strong>{item.title || workspace.t("slideTitle")}</strong>
            </button>
          ))}
          <Button
            onClick={() => {
              if (file.slides.length >= 30) return;
              update({ ...file, slides: [...file.slides, blankSlide()] });
              setIndex(file.slides.length);
              setSelectedId("title");
            }}
          >
            {workspace.t("slideAdd")}
          </Button>
        </aside>
        <div className={`ow-slide-stage ow-theme-${slide.theme}`}>
          <div className={`ow-slide-canvas ow-theme-${slide.theme} ow-trans-${slide.transition ?? "none"}`} style={{ background: slide.background }} onPointerDown={() => setSelectedId(null)}>
            {file.master ? <p className="ow-master">{file.master}</p> : null}
            {slide.items.map((item) => renderItem(item, true))}
          </div>
        </div>
        <aside className="ow-slide-tools" aria-label={workspace.t("slideTheme")}>
          <Select
            label={workspace.t("slideTheme")}
            value={slide.theme}
            onChange={(event) => patchCurrent((current) => ({ ...current, theme: event.target.value as SlideTheme }))}
          >
            {SLIDE_THEMES.map((theme) => (
              <option key={theme} value={theme}>{workspace.t(THEME_KEY[theme])}</option>
            ))}
          </Select>
          {help ? <p role="status">{workspace.t("shortcutsBody")}</p> : null}
          {selected?.kind === "text" ? (
            <label className="ow-field">
              {selected.id === "title" ? workspace.t("slideTitle") : workspace.t("slideBody")}
              <textarea
                value={selected.text}
                onChange={(event) => {
                  const text = event.target.value.slice(0, selected.id === "title" ? 180 : 4000);
                  patchCurrent((current) => ({
                    ...current,
                    items: current.items.map((item) => (item.id === selected.id && item.kind === "text" ? { ...item, text } : item)),
                  }));
                }}
              />
            </label>
          ) : null}
          {selected?.kind === "shape" ? (
            <div className="ow-swatches" role="group" aria-label={workspace.t("slideShape")}>
              {SLIDE_FILLS.map((fill) => (
                <button
                  key={fill}
                  type="button"
                  className="ow-swatch"
                  style={{ background: fill }}
                  aria-label={fill}
                  aria-pressed={selected.fill === fill}
                  onClick={() => patchCurrent((current) => ({
                    ...current,
                    items: current.items.map((item) => (item.id === selected.id && item.kind === "shape" ? { ...item, fill } : item)),
                  }))}
                />
              ))}
            </div>
          ) : null}
          <label className="ow-field">
            {workspace.t("slideNotes")}
            <textarea className="ow-speaker" aria-label={workspace.t("slideNotes")} value={slide.notes ?? ""} onChange={(event) => patchCurrent((current) => ({ ...current, notes: event.target.value.slice(0, 2000) }))} />
          </label>
          <input
            ref={imageRef}
            className="ow-sr"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            aria-label={workspace.t("slideImage")}
            onChange={(event) => {
              const picked = event.target.files?.[0];
              event.target.value = "";
              if (!picked || picked.size > 2_000_000) return;
              const reader = new FileReader();
              reader.onload = () => {
                const src = typeof reader.result === "string" ? reader.result : "";
                if (!src.startsWith("data:image/") || src.length >= 2_800_000) return;
                addItem({ id: crypto.randomUUID().slice(0, 12), kind: "image", x: 96, y: 96, w: 320, h: 200, src });
              };
              reader.readAsDataURL(picked);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
