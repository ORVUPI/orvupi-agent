import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useWorkspace } from "../app/workspace";
import { Button, Input } from "../ui/kit";
import { MenuBar } from "../ui/menus";
import { createId } from "../security/names";
import { SLIDE_FILLS, type SlideItem } from "../slides/model";
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
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!workspace.openDrawingId || !workspace.storage) {
      setFile(null);
      return;
    }
    const id = workspace.openDrawingId;
    let cancel = false;
    workspace.storage.loadFile(id).then((loaded) => {
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

  if (!file) return <p>{workspace.t("preparing")}</p>;
  const selected = file.items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="ow-page ow-draw-page" data-tool="drawings">
      <h1 className="ow-sr">{file.title}</h1>
      <div className="ow-row">
        <Input label={workspace.t("fileName")} value={file.title} onChange={(event) => update({ ...file, title: event.target.value.slice(0, 180) })} />
        <p role="status">{status === "saved" ? workspace.t("statusSaved") : workspace.t("statusPending")}</p>
      </div>
      <MenuBar
        label={workspace.t("menuBar")}
        menus={[
          { id: "file", label: workspace.t("menuFile"), items: [{ id: "hint", label: workspace.t("drawingHint"), onSelect: () => workspace.pushToast(workspace.t("drawingHint")) }] },
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
          ] },
          { id: "format", label: workspace.t("menuFormat"), items: [{ id: "fill", label: workspace.t("slideShape"), onSelect: () => {
            if (!selected || selected.kind !== "shape") return;
            const index = SLIDE_FILLS.indexOf(selected.fill as (typeof SLIDE_FILLS)[number]);
            const fill = SLIDE_FILLS[(index + 1) % SLIDE_FILLS.length] ?? "#1d4e89";
            update({ ...file, items: file.items.map((item) => item.id === selected.id && item.kind === "shape" ? { ...item, fill } : item) });
          } }] },
          { id: "tools", label: workspace.t("menuTools"), items: [{ id: "hint", label: workspace.t("drawingHint"), onSelect: () => workspace.pushToast(workspace.t("drawingHint")) }] },
          { id: "help", label: workspace.t("menuHelp"), items: [{ id: "keys", label: workspace.t("shortcuts"), onSelect: () => workspace.pushToast(workspace.t("shortcutsDriveBody")) }] },
        ]}
      />
      <div className="ow-draw-work">
        <div className="ow-draw-tools" role="toolbar" aria-label={workspace.t("menuInsert")}>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "text", x: 80, y: 80, w: 240, h: 72, text: workspace.t("slideText") })}>{workspace.t("slideText")}</Button>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "rect", x: 140, y: 120, w: 180, h: 110, fill: "#1d4e89" })}>{workspace.t("shapeRect")}</Button>
          <Button onClick={() => addItem({ id: createId().slice(0, 12), kind: "shape", shape: "ellipse", x: 200, y: 180, w: 140, h: 140, fill: "#ff3070" })}>{workspace.t("shapeEllipse")}</Button>
          <Button onClick={() => imageRef.current?.click()}>{workspace.t("slideImage")}</Button>
        </div>
        <div className="ow-draw-stage">
          <div className="ow-draw-canvas" onPointerDown={() => setSelectedId(null)}>
            {file.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ow-slide-item${selectedId === item.id ? " is-selected" : ""}`}
                aria-label={item.kind === "text" ? workspace.t("slideText") : item.kind === "image" ? workspace.t("slideImage") : workspace.t("slideShape")}
                aria-pressed={selectedId === item.id}
                style={{
                  left: `${(item.x / CANVAS_W) * 100}%`,
                  top: `${(item.y / CANVAS_H) * 100}%`,
                  width: `${(item.w / CANVAS_W) * 100}%`,
                  height: `${(item.h / CANVAS_H) * 100}%`,
                  background: item.kind === "shape" ? item.fill : "transparent",
                  color: item.kind === "shape" ? inkFor(item.fill) : "#102032",
                  borderRadius: item.kind === "shape" && item.shape === "ellipse" ? "50%" : undefined,
                }}
                onPointerDown={(event) => startDrag(event, item)}
              >
                {item.kind === "text" ? item.text : null}
                {item.kind === "image" ? <img src={item.src} alt="" /> : null}
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
