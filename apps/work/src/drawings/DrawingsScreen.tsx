import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useWorkspace } from "../app/workspace";
import { loadFileWhenReady } from "../routing/load";
import { downloadBytes } from "../security/bytes";
import { Button, Input } from "../ui/kit";
import { absentOnDevice, MissingFile } from "../ui/MissingFile";
import { MenuBar } from "../ui/menus";
import { APP_VERSION } from "../version";
import { createId, fileNameWithExtension } from "../security/names";
import { SLIDE_FILLS, alignItem, orderItems, type SlideItem } from "../slides/model";
import { drawingPng, drawingSvg } from "./export";
import { parseDrawing, serializeDrawing, type DrawingFile } from "./model";

const CANVAS_W = 960;
const CANVAS_H = 640;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inkFor(fill: string): string {
  return fill === "#102032" || fill === "#0b5d36" || fill === "#1d4e89" ? "#fff8ec" : "#102032";
}

export function DrawingsScreen() {
  const workspace = useWorkspace();
  const drawings = workspace.files.filter((file) => file.deletedAt === null && file.kind === "drawing");
  const [file, setFile] = useState<DrawingFile | null>(null);
  const [status, setStatus] = useState<"saved" | "pending">("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!workspace.openDrawingId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openDrawingId;
    let cancel = false;
    loadFileWhenReady(workspace.storage, id).then((loaded) => {
      if (cancel || loaded.integrity === "mismatch") return;
      setFile(parseDrawing(loaded.bytes));
      setStatus("saved");
      setSelectedId(null);
    }).catch(workspace.reportError);
    return () => {
      cancel = true;
    };
  }, [workspace.openDrawingId, workspace.storage, workspace.reportError]);

  useEffect(() => {
    if (!file || !workspace.storage || status !== "pending") return;
    const timer = window.setTimeout(() => {
      void workspace.storage?.saveFile({
        id: file.id,
        name: file.title,
        kind: "drawing",
        mime: "application/vnd.orvupi.drawing+json",
        bytes: serializeDrawing(file),
        snippet: file.items.map((item) => item.kind === "text" ? item.text : item.kind).join(" ").slice(0, 4000),
      }).then(() => workspace.refreshFiles()).then(() => setStatus("saved")).catch(workspace.reportError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [file, status, workspace.storage, workspace.refreshFiles, workspace.reportError]);

  function update(next: DrawingFile) {
    setFile(next);
    setStatus("pending");
  }

  function addItem(item: SlideItem) {
    if (!file || file.items.length >= 40) return;
    update({ ...file, items: [...file.items, item] });
    setSelectedId(item.id);
  }

  function startDrag(event: ReactPointerEvent, item: SlideItem) {
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = item.x;
    const originY = item.y;
    const move = (ev: PointerEvent) => {
      setFile((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((entry) => entry.id === item.id ? { ...entry, x: clamp(originX + ev.clientX - startX, 0, CANVAS_W - 40), y: clamp(originY + ev.clientY - startY, 0, CANVAS_H - 28) } : entry),
        };
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

  if (!workspace.openDrawingId) {
    return (
      <div className="ow-page" data-tool="drawings">
        <h1>{workspace.t("navDrawings")}</h1>
        <p>{workspace.t("drawingHint")}</p>
        <Button variant="primary" onClick={() => void workspace.createDrawing(null)}>{workspace.t("newDrawing")}</Button>
        <div className="ow-list">
          {drawings.map((entry) => (
            <Button key={entry.id} onClick={() => workspace.openDrawing(entry.id)}>{entry.name}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (absentOnDevice(workspace.ready, workspace.openDrawingId, workspace.files)) {
    return <MissingFile message={workspace.t("fileMissing")} action={workspace.t("backToDrive")} onBack={() => void workspace.showBrowse("folder")} />;
  }

  if (!file) return <p>{workspace.t("preparing")}</p>;
  const selected = file.items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="ow-page ow-draw-page" data-tool="drawings">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-editor-line">
      <div className="ow-row">
        <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update({ ...file, title: event.target.value.slice(0, 180) })} />
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [
            { id: "download", label: workspace.t("download"), onSelect: () => downloadBytes(serializeDrawing(file), fileNameWithExtension(file.title, "ordraw"), "application/vnd.orvupi.drawing+json") },
            { id: "png", label: workspace.t("drawPng"), onSelect: () => {
              const url = drawingPng(file.items);
              const bytes = Uint8Array.from(atob(url.split(",")[1] ?? ""), (char) => char.charCodeAt(0));
              downloadBytes(bytes, fileNameWithExtension(file.title, "png"), "image/png");
            } },
            { id: "svg", label: workspace.t("drawSvg"), onSelect: () => downloadBytes(new TextEncoder().encode(drawingSvg(file.items)), fileNameWithExtension(file.title, "svg"), "image/svg+xml") },
          ] },
          { id: "edit", label: workspace.t("menuEdit"), items: [{ id: "remove", label: workspace.t("slideRemove"), onSelect: () => {
            if (!selected) return;
            update({ ...file, items: file.items.filter((item) => item.id !== selected.id) });
            setSelectedId(null);
          } }] },
          { id: "view", label: workspace.t("menuView"), items: [{ id: "canvas", label: workspace.t("navDrawings"), onSelect: () => setSelectedId(null) }] },
          { id: "insert", label: workspace.t("menuInsert"), items: [
            { id: "text", label: workspace.t("slideText"), onSelect: () => addItem({ id: createId().slice(0, 12), kind: "text", x: 80, y: 80, w: 240, h: 72, text: workspace.t("slideText") }) },
            { id: "rect", label: workspace.t("shapeRect"), onSelect: () => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "rect", x: 140, y: 120, w: 180, h: 110, fill: "#1d4e89" }) },
            { id: "ellipse", label: workspace.t("shapeEllipse"), onSelect: () => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "ellipse", x: 200, y: 180, w: 140, h: 140, fill: "#ff3070" }) },
            { id: "image", label: workspace.t("slideImage"), onSelect: () => imageRef.current?.click() },
            { id: "line", label: workspace.t("slideLine"), onSelect: () => addItem({ id: createId().slice(0, 12), kind: "line", x: 80, y: 200, w: 280, h: 12 }) },
            { id: "art", label: workspace.t("decorText"), onSelect: () => addItem({ id: createId().slice(0, 12), kind: "text", x: 70, y: 48, w: 420, h: 90, text: "ORVUPI", bold: true, size: 48, color: "#ff3070" }) },
            { id: "diagram", label: workspace.t("diagram"), onSelect: () => {
              const a = createId().slice(0, 12);
              const b = createId().slice(0, 12);
              const c = createId().slice(0, 12);
              update({ ...file, items: [...file.items, { id: a, kind: "shape", shape: "rect", x: 40, y: 220, w: 160, h: 80, fill: "#1d4e89" }, { id: b, kind: "line", x: 200, y: 250, w: 80, h: 12 }, { id: c, kind: "shape", shape: "rect", x: 280, y: 220, w: 160, h: 80, fill: "#0b5d36" }] });
            } },
          ] },
          { id: "format", label: workspace.t("menuFormat"), items: [{ id: "fill", label: workspace.t("slideShape"), onSelect: () => {
            if (!selected || selected.kind !== "shape") return;
            const index = SLIDE_FILLS.indexOf(selected.fill as (typeof SLIDE_FILLS)[number]);
            const fill = SLIDE_FILLS[(index + 1) % SLIDE_FILLS.length] ?? "#1d4e89";
            update({ ...file, items: file.items.map((item) => item.id === selected.id && item.kind === "shape" ? { ...item, fill } : item) });
          } }] },
          { id: "tools", label: workspace.t("menuTools"), items: [
            { id: "center", label: workspace.t("alignCenter"), onSelect: () => {
              if (!selected) return;
              update({ ...file, items: file.items.map((item) => item.id === selected.id ? alignItem(item, CANVAS_W, CANVAS_H, "center") : item) });
            } },
            { id: "front", label: workspace.t("slideFront"), onSelect: () => { if (selected) update({ ...file, items: orderItems(file.items, selected.id, "front") }); } },
            { id: "back", label: workspace.t("slideBack"), onSelect: () => { if (selected) update({ ...file, items: orderItems(file.items, selected.id, "back") }); } },
          ] },
          { id: "help", label: workspace.t("menuHelp"), items: [
            { id: "version", label: workspace.t("appVersion", { version: APP_VERSION }), static: true },
            { id: "keys", label: workspace.t("shortcuts"), onSelect: () => setHelp(true) },
          ] },
        ]}
      />
      </div>
      {help ? <p role="status">{workspace.t("drawingHint")}</p> : null}
      <div className="ow-draw-work">
        <div className="ow-draw-tools" role="toolbar" aria-label={workspace.t("menuInsert")}>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "text", x: 80, y: 80, w: 240, h: 72, text: workspace.t("slideText") })}>{workspace.t("slideText")}</Button>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "rect", x: 140, y: 120, w: 180, h: 110, fill: "#1d4e89" })}>{workspace.t("shapeRect")}</Button>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "ellipse", x: 200, y: 180, w: 140, h: 140, fill: "#ff3070" })}>{workspace.t("shapeEllipse")}</Button>
          <Button onClick={() => imageRef.current?.click()}>{workspace.t("slideImage")}</Button>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "line", x: 80, y: 200, w: 280, h: 12 })}>{workspace.t("slideLine")}</Button>
        </div>
        <div className="ow-draw-stage">
          <div className="ow-draw-canvas" onPointerDown={() => setSelectedId(null)}>
            {file.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ow-slide-item${selectedId === item.id ? " is-selected" : ""}`}
                aria-label={item.kind === "text" ? (item.text.trim() || workspace.t("slideText")) : item.kind === "image" ? workspace.t("slideImage") : item.kind === "line" ? workspace.t("slideLine") : workspace.t("slideShape")}
                style={{
                  left: `${(item.x / CANVAS_W) * 100}%`,
                  top: `${(item.y / CANVAS_H) * 100}%`,
                  width: `${(item.w / CANVAS_W) * 100}%`,
                  height: `${(item.h / CANVAS_H) * 100}%`,
                  background: item.kind === "shape" ? item.fill : item.kind === "text" ? item.fill : "transparent",
                  color: item.kind === "shape" ? inkFor(item.fill) : item.kind === "text" ? (item.color ?? "#102032") : "#102032",
                  fontWeight: item.kind === "text" && item.bold ? 800 : undefined,
                  fontSize: item.kind === "text" && item.size ? item.size : undefined,
                  borderRadius: item.kind === "shape" && item.shape === "ellipse" ? "50%" : undefined,
                }}
                aria-pressed={selectedId === item.id}
                onPointerDown={(event) => startDrag(event, item)}
              >
                {item.kind === "text" ? item.text : null}
                {item.kind === "image" ? <img src={item.src} alt="" /> : null}
                {item.kind === "line" ? <svg className="ow-slide-line" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="10" x2="100" y2="10" stroke="#102032" strokeWidth="4" /></svg> : null}
              </button>
            ))}
          </div>
        </div>
        {selected?.kind === "text" ? (
          <label className="ow-field">
            {workspace.t("slideText")}
            <textarea value={selected.text} onChange={(event) => update({
              ...file,
              items: file.items.map((item) => item.id === selected.id && item.kind === "text" ? { ...item, text: event.target.value.slice(0, 4000) } : item),
            })} />
          </label>
        ) : null}
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
              addItem({ id: createId().slice(0, 12), kind: "image", x: 80, y: 80, w: 280, h: 180, src });
            };
            reader.readAsDataURL(picked);
          }}
        />
      </div>
    </div>
  );
}
