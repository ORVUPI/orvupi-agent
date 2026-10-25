import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useWorkspace } from "../app/workspace";
import { docToText } from "../docs/model";
import { parseOrvdoc } from "../docs/orvdoc";
import { breadcrumb, sortFiles, visibleFiles, type FileSortKey } from "./query";
import { zipStore } from "../sheets/zip";
import { downloadBytes } from "../security/bytes";
import { isWorkError } from "../security/errors";
import { formatBytes } from "../security/names";
import { STUDIO_DESIGN_MIME } from "../routing/paths";
import type { FileKind, FileRecord } from "../storage/types";
import { Icon, type IconName } from "../ui/icons";
import { Button, EmptyState, IconButton, Input, Select } from "../ui/kit";
import { ContextMenu, Dialog, Modal, type MenuItem } from "../ui/overlay";

const COLORS = [
  { id: "#1d4e89", key: "colorBlue" },
  { id: "#0b5d36", key: "colorGreen" },
  { id: "#9a3412", key: "colorOrange" },
  { id: "#a3123f", key: "colorRed" },
  { id: "#5b2a86", key: "colorViolet" },
  { id: "#7a4a00", key: "colorAmber" },
] as const;

function kindIcon(kind: FileKind): IconName {
  if (kind === "folder") return "files";
  if (kind === "doc") return "docs";
  if (kind === "sheet") return "sheets";
  if (kind === "slide") return "slides";
  if (kind === "form") return "forms";
  if (kind === "drawing") return "drawings";
  if (kind === "note") return "notes";
  if (kind === "pdf") return "pdf";
  return "docs";
}

function kindKey(kind: FileKind): "kindFolder" | "kindDoc" | "kindSheet" | "kindSlide" | "kindForm" | "kindDrawing" | "kindNote" | "kindPdf" | "kindOther" {
  if (kind === "folder") return "kindFolder";
  if (kind === "doc") return "kindDoc";
  if (kind === "sheet") return "kindSheet";
  if (kind === "slide") return "kindSlide";
  if (kind === "form") return "kindForm";
  if (kind === "drawing") return "kindDrawing";
  if (kind === "note") return "kindNote";
  if (kind === "pdf") return "kindPdf";
  return "kindOther";
}

function kindLabel(file: { kind: FileKind; mime: string }, t: (key: ReturnType<typeof kindKey>) => string): string {
  if (file.mime === STUDIO_DESIGN_MIME) return "Diseño de Studio";
  return t(kindKey(file.kind));
}

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function FilesScreen() {
  const workspace = useWorkspace();
  const mode = workspace.browse;
  const folderId = workspace.folderId;
  const setFolderId = workspace.setFolderId;
  const [sortKey, setSortKey] = useState<FileSortKey>(mode === "recent" ? "updated" : "name");
  const [direction, setDirection] = useState<"asc" | "desc">(mode === "recent" ? "desc" : "asc");
  const [menu, setMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [rename, setRename] = useState<FileRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tagsFor, setTagsFor] = useState<FileRecord | null>(null);
  const [tagsValue, setTagsValue] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [confirm, setConfirm] = useState<FileRecord | "all" | null>(null);
  const [moving, setMoving] = useState<FileRecord | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);

  const crumbs = breadcrumb(workspace.files, folderId);
  const visible = useMemo(
    () =>
      sortFiles(
        visibleFiles(workspace.files, {
          mode,
          folderId: mode === "folder" ? folderId : null,
          query: workspace.query,
          kind: workspace.kindFilter,
          date: workspace.dateFilter,
        }),
        sortKey,
        direction,
      ),
    [workspace.files, workspace.query, workspace.kindFilter, workspace.dateFilter, mode, folderId, sortKey, direction],
  );
  const details = workspace.files.find((file) => file.id === detailsId) ?? null;

  useEffect(() => {
    const onShortcut = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "toggle-layout") workspace.setDriveLayout(workspace.driveLayout === "list" ? "grid" : "list");
      if (detail === "toggle-details") workspace.setDetailsOpen(!workspace.detailsOpen);
      if (detail === "new-folder" && mode === "folder") {
        void workspace.storage?.createFolder(workspace.t("newFolder"), folderId).then(() => workspace.refreshFiles()).catch(workspace.reportError);
      }
    };
    window.addEventListener("ow-drive", onShortcut);
    return () => window.removeEventListener("ow-drive", onShortcut);
  }, [folderId, mode, workspace]);

  useEffect(() => {
    if (!details || !workspace.storage || !workspace.detailsOpen) {
      setPreviewText("");
      setPreviewUrl("");
      return;
    }
    let url = "";
    let cancel = false;
    workspace.storage
      .loadFile(details.id)
      .then((loaded) => {
        if (cancel) return;
        if (loaded.record.mime.startsWith("image/")) {
          const copy = new Uint8Array(loaded.bytes.byteLength);
          copy.set(loaded.bytes);
          url = URL.createObjectURL(new Blob([copy], { type: loaded.record.mime }));
          setPreviewUrl(url);
          setPreviewText("");
          return;
        }
        if (loaded.record.kind === "doc" && loaded.integrity === "ok") {
          setPreviewText(docToText(parseOrvdoc(loaded.bytes).content).slice(0, 800));
          return;
        }
        if (loaded.record.mime.startsWith("text/") || loaded.record.name.endsWith(".csv")) {
          setPreviewText(new TextDecoder().decode(loaded.bytes).slice(0, 800));
          return;
        }
        setPreviewText(workspace.t(loaded.record.kind === "pdf" ? "previewPdf" : "previewGeneric"));
      })
      .catch(() => {
        if (!cancel) setPreviewText(workspace.t("reasonMissing"));
      });
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [details, workspace.storage, workspace.t, workspace.detailsOpen]);

  const lastClick = useRef<{ id: string; at: number } | null>(null);

  function openName(file: FileRecord) {
    if (file.kind === "folder" || file.deletedAt) {
      openFile(file);
      return;
    }
    const now = Date.now();
    if (lastClick.current?.id === file.id && now - lastClick.current.at < 500) {
      lastClick.current = null;
      openFile(file);
      return;
    }
    lastClick.current = { id: file.id, at: now };
    toggleSelected(file, false);
  }

  function openFile(file: FileRecord) {
    if (file.deletedAt) return;
    if (file.kind === "folder") {
      workspace.showBrowse("folder");
      setFolderId(file.id);
      setSelected([]);
      return;
    }
    workspace.openRecord(file);
  }

  async function moveTo(id: string, parentId: string | null) {
    if (!workspace.storage) return;
    await workspace.storage.moveFile(id, parentId);
    await workspace.refreshFiles();
    workspace.pushToast(workspace.t("toastMoved"));
  }

  function onDrop(event: DragEvent, parentId: string | null) {
    event.preventDefault();
    const moved = event.dataTransfer.getData("application/x-orvupi-id");
    if (moved) {
      void moveTo(moved, parentId).catch(workspace.reportError);
      return;
    }
    const files = [...event.dataTransfer.files];
    if (files.some((file) => file.webkitRelativePath)) void workspace.importTree(files, parentId);
    else for (const file of files) void workspace.importUserFile(file, parentId);
  }

  function toggleSelected(file: FileRecord, shift: boolean) {
    setDetailsId(file.id);
    if (shift && anchor) {
      const from = visible.findIndex((item) => item.id === anchor);
      const to = visible.findIndex((item) => item.id === file.id);
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from];
        setSelected(visible.slice(start, end + 1).map((item) => item.id));
        return;
      }
    }
    setAnchor(file.id);
    setSelected((current) => (current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id]));
  }

  function itemsFor(file: FileRecord): MenuItem[] {
    return [
      { id: "open", label: workspace.t("open"), onSelect: () => openFile(file) },
      { id: "details", label: workspace.t("details"), onSelect: () => { setDetailsId(file.id); workspace.setDetailsOpen(true); } },
      {
        id: "star",
        label: file.favorite ? workspace.t("unstar") : workspace.t("star"),
        onSelect: () => void workspace.storage?.setFavorite(file.id, !file.favorite).then(() => workspace.refreshFiles()).catch(workspace.reportError),
      },
      { id: "rename", label: workspace.t("rename"), onSelect: () => { setRename(file); setRenameValue(file.name); } },
      { id: "tags", label: workspace.t("tags"), onSelect: () => { setTagsFor(file); setTagsValue(file.tags.join(", ")); } },
      {
        id: "duplicate",
        label: workspace.t("duplicate"),
        onSelect: () => void workspace.storage?.duplicateFile(file.id).then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastDuplicated"))).catch(workspace.reportError),
      },
      { id: "move", label: workspace.t("moveTo"), onSelect: () => setMoving(file) },
      { id: "shortcut", label: workspace.t("makeShortcut"), onSelect: () => void workspace.storage?.createShortcut(file.id).then(() => workspace.refreshFiles()).catch(workspace.reportError) },
      {
        id: "download",
        label: file.kind === "folder" ? workspace.t("downloadFolder") : workspace.t("download"),
        onSelect: () => {
          if (!workspace.storage) return;
          if (file.kind !== "folder") {
            void workspace.storage.exportFile(file.id).then((fileExport) => downloadBytes(fileExport.bytes, fileExport.filename, fileExport.record.mime)).catch(workspace.reportError);
            return;
          }
          const pending = [file.id];
          const seen = new Set<string>();
          const entries: Array<{ name: string; data: Uint8Array }> = [];
          const walk = async () => {
            while (pending.length > 0) {
              const current = pending.shift();
              if (!current || seen.has(current)) continue;
              seen.add(current);
              for (const child of workspace.files) {
                if (child.folderId !== current || child.deletedAt) continue;
                if (child.kind === "folder") pending.push(child.id);
                else {
                  const exported = await workspace.storage!.exportFile(child.id);
                  entries.push({ name: exported.filename, data: exported.bytes });
                }
              }
            }
            downloadBytes(zipStore(entries), `${file.name}.zip`, "application/zip");
          };
          void walk().catch(workspace.reportError);
        },
      },
      {
        id: "trash",
        label: file.deletedAt ? workspace.t("restore") : workspace.t("removeShort"),
        danger: !file.deletedAt,
        onSelect: () => {
          if (file.deletedAt) {
            void workspace.storage?.restoreFile(file.id).then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastRestoredFile"))).catch(workspace.reportError);
            return;
          }
          // Eliminar mueve a la papelera (recuperable) y ofrece deshacer.
          void workspace.storage?.deleteFile(file.id).then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastDeleted"), {
            label: workspace.t("undo"),
            run: () => void workspace.storage?.restoreFile(file.id).then(() => workspace.refreshFiles()).catch(workspace.reportError),
          })).catch(workspace.reportError);
        },
      },
    ];
  }

  const title =
    mode === "recent" ? workspace.t("filesRecent") : mode === "starred" ? workspace.t("filesStarred") : mode === "trash" ? workspace.t("filesTrash") : workspace.t("navFiles");

  return (
    <div className="ow-drive" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, mode === "folder" ? folderId : null)}>
      <div className="ow-drive-main">
        <header className="ow-drive-bar">
          <div className="ow-drive-heading">
            <h1 className="ow-drive-title">{title}</h1>
            <p className="ow-muted ow-drop-hint">{workspace.t("dropFiles")}</p>
            <p className="ow-storage-line">{workspace.t("storageOf", { used: workspace.usedLabel })}</p>
          </div>
          <div className="ow-drive-tools" role="toolbar" aria-label={title}>
            {mode === "folder" ? (
              <Button
                variant="primary"
                onClick={() => {
                  void workspace.storage?.createFolder(workspace.t("newFolder"), folderId).then(() => workspace.refreshFiles()).catch(workspace.reportError);
                }}
              >
                {workspace.t("newFolder")}
              </Button>
            ) : null}
            <div className="ow-view-toggle">
              <IconButton label={workspace.t("viewList")} pressed={workspace.driveLayout === "list"} onClick={() => workspace.setDriveLayout("list")}>
                <Icon name="list" />
              </IconButton>
              <IconButton label={workspace.t("viewGrid")} pressed={workspace.driveLayout === "grid"} onClick={() => workspace.setDriveLayout("grid")}>
                <Icon name="grid" />
              </IconButton>
            </div>
            <IconButton label={workspace.detailsOpen ? workspace.t("detailsHide") : workspace.t("details")} pressed={workspace.detailsOpen} onClick={() => workspace.setDetailsOpen(!workspace.detailsOpen)}>
              <Icon name="info" />
            </IconButton>
            <Select label={workspace.t("sortBy")} value={sortKey} onChange={(event) => setSortKey(event.target.value as FileSortKey)}>
              <option value="name">{workspace.t("sortName")}</option>
              <option value="updated">{workspace.t("sortUpdated")}</option>
              <option value="created">{workspace.t("sortCreated")}</option>
              <option value="size">{workspace.t("sortSize")}</option>
              <option value="kind">{workspace.t("sortKind")}</option>
            </Select>
            <Button onClick={() => setDirection((value) => (value === "asc" ? "desc" : "asc"))}>{direction === "asc" ? "A–Z" : "Z–A"}</Button>
          </div>
        </header>
        {mode === "folder" ? (
          <nav className="ow-crumbs" aria-label={workspace.t("root")} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, null)}>
            <button type="button" onClick={() => setFolderId(null)}>{workspace.t("root")}</button>
            {crumbs.map((crumb) => (
              <span key={crumb.id}>
                <span aria-hidden="true">/</span>
                <button type="button" onClick={() => setFolderId(crumb.id)}>{crumb.name}</button>
              </span>
            ))}
          </nav>
        ) : null}
        <div className={`ow-actionbar ${selected.length === 0 ? "is-idle" : ""}`} role={selected.length > 0 ? "toolbar" : undefined} aria-hidden={selected.length === 0} inert={selected.length === 0} aria-label={selected.length > 0 ? workspace.t("selectedCount", { count: selected.length }) : undefined}>
            <strong>{workspace.t("selectedCount", { count: selected.length })}</strong>
            <Button onClick={() => {
              void Promise.all(selected.map((id) => workspace.storage?.setFavorite(id, true))).then(() => workspace.refreshFiles()).catch(workspace.reportError);
            }}>{workspace.t("star")}</Button>
            <Button onClick={() => {
              const action = mode === "trash"
                ? Promise.all(selected.map((id) => workspace.storage?.restoreFile(id)))
                : Promise.all(selected.map((id) => workspace.storage?.deleteFile(id)));
              void action.then(() => workspace.refreshFiles()).then(() => setSelected([])).catch(workspace.reportError);
            }}>{mode === "trash" ? workspace.t("restore") : workspace.t("remove")}</Button>
            <Button onClick={() => setSelected([])}>{workspace.t("clearSelection")}</Button>
          </div>
        {visible.length === 0 ? <EmptyState title={mode === "trash" ? workspace.t("trashEmpty") : workspace.t("filesEmpty")} body={workspace.t("emptyBody")} /> : null}
        {workspace.driveLayout === "list" ? (
          <table className="ow-drive-table">
            <thead>
              <tr>
                <th><span className="ow-sr">{workspace.t("colSelect")}</span></th>
                <th><button type="button" onClick={() => setSortKey("name")}>{workspace.t("colName")}</button></th>
                <th className="ow-col-extra"><button type="button" onClick={() => setSortKey("updated")}>{workspace.t("colModified")}</button></th>
                <th className="ow-col-extra"><button type="button" onClick={() => setSortKey("size")}>{workspace.t("colSize")}</button></th>
                <th><span className="ow-sr">{workspace.t("fileMenu")}</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((file) => (
                <tr
                  key={file.id}
                  className={selected.includes(file.id) ? "is-selected" : undefined}
                  draggable={file.deletedAt === null}
                  onDragStart={(event) => event.dataTransfer.setData("application/x-orvupi-id", file.id)}
                  onDragOver={(event) => { if (file.kind === "folder") event.preventDefault(); }}
                  onDrop={(event) => {
                    if (file.kind !== "folder") return;
                    event.preventDefault();
                    event.stopPropagation();
                    onDrop(event, file.id);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({ x: event.clientX, y: event.clientY, file });
                  }}
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={file.name}
                      checked={selected.includes(file.id)}
                      onClick={(event) => toggleSelected(file, event.shiftKey)}
                      onChange={() => undefined}
                    />
                  </td>
                  <td>
                    <div className="ow-file-name">
                      <span className={`ow-kind ow-kind-${file.kind}`} aria-hidden="true"><Icon name={kindIcon(file.kind)} /></span>
                      <button
                        type="button"
                        className="ow-file-open"
                        onClick={() => openName(file)}
                      >
                        <strong>{file.favorite ? "★ " : ""}{file.name}</strong>
                        <span className="ow-sr">{kindLabel(file, (key) => workspace.t(key))}</span>
                      </button>
                    </div>
                  </td>
                  <td className="ow-col-extra">{formatWhen(file.updatedAt, workspace.locale)}</td>
                  <td className="ow-col-extra">{file.kind === "folder" ? "" : formatBytes(file.size, workspace.locale)}</td>
                  <td>
                    <IconButton
                      label={workspace.t("fileMenu")}
                      onClick={(event) => {
                        event.stopPropagation();
                        const box = event.currentTarget.getBoundingClientRect();
                        setMenu({ x: box.right, y: box.bottom, file });
                      }}
                    >
                      <Icon name="more" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ow-grid">
            {visible.map((file) => (
              <article
                key={file.id}
                className={`ow-file-card${selected.includes(file.id) ? " is-selected" : ""}`}
                style={{ borderColor: file.color ?? undefined }}
                draggable={file.deletedAt === null}
                onDragStart={(event) => event.dataTransfer.setData("application/x-orvupi-id", file.id)}
                onDragOver={(event) => { if (file.kind === "folder") event.preventDefault(); }}
                onDrop={(event) => {
                  if (file.kind !== "folder") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onDrop(event, file.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, file });
                }}
              >
                <div className="ow-file-card-top">
                  <input type="checkbox" aria-label={file.name} checked={selected.includes(file.id)} onClick={(event) => toggleSelected(file, event.shiftKey)} onChange={() => undefined} />
                  <IconButton
                    label={workspace.t("fileMenu")}
                    onClick={(event) => {
                      event.stopPropagation();
                      const box = event.currentTarget.getBoundingClientRect();
                      setMenu({ x: box.right, y: box.bottom, file });
                    }}
                  >
                    <Icon name="more" />
                  </IconButton>
                </div>
                <span className={`ow-kind ow-kind-lg ow-kind-${file.kind}`} aria-hidden="true"><Icon name={kindIcon(file.kind)} /></span>
                <button
                  type="button"
                  className="ow-file-open"
                  onClick={() => openName(file)}
                >
                  <strong>{file.favorite ? "★ " : ""}{file.name}</strong>
                  <span className="ow-sr">{kindLabel(file, (key) => workspace.t(key))}</span>
                </button>
                <p className="ow-muted">{formatWhen(file.updatedAt, workspace.locale)}</p>
              </article>
            ))}
          </div>
        )}
        {mode === "trash" && visible.length > 0 ? <Button variant="danger" onClick={() => setConfirm("all")}>{workspace.t("purgeAll")}</Button> : null}
      </div>
      {workspace.detailsOpen && details ? (
        <aside className="ow-details" aria-label={workspace.t("details")}>
          <header className="ow-row">
            <h2>{details.name}</h2>
            <Button onClick={() => workspace.setDetailsOpen(false)}>{workspace.t("detailsHide")}</Button>
          </header>
          <p>{workspace.t(kindKey(details.kind))}</p>
          {previewUrl ? <img src={previewUrl} alt={details.name} /> : <pre>{previewText}</pre>}
          <h3>{workspace.t("activity")}</h3>
          <p>{workspace.t("createdLabel")}: {formatWhen(details.createdAt, workspace.locale)}</p>
          <p>{workspace.t("colModified")}: {formatWhen(details.updatedAt, workspace.locale)}</p>
          <h3>{workspace.t("versions")}</h3>
          <Button onClick={() => {
            if (!workspace.storage) return;
            void workspace.storage.duplicateFile(details.id).then((copy) => workspace.storage?.renameFile(copy.id, `${details.name} · v ${new Date().toISOString().slice(0, 16).replace("T", " ")}`)).then(() => workspace.refreshFiles()).catch(workspace.reportError);
          }}>{workspace.t("saveVersion")}</Button>
          {workspace.files.filter((item) => item.name.startsWith(`${details.name} · v `) && item.deletedAt === null).map((version) => (
            <p key={version.id}>
              {version.name}
              <Button onClick={() => {
                if (!workspace.storage) return;
                void workspace.storage.loadFile(version.id).then((loaded) => workspace.storage?.saveFile({
                  id: details.id,
                  name: details.name,
                  kind: details.kind,
                  mime: details.mime,
                  bytes: loaded.bytes,
                  folderId: details.folderId,
                })).then(() => workspace.refreshFiles()).catch(workspace.reportError);
              }}>{workspace.t("restoreVersion")}</Button>
            </p>
          ))}
          <p>{workspace.t("colSize")}: {formatBytes(details.size, workspace.locale)}</p>
          {details.tags.length > 0 ? <p>{details.tags.join(" · ")}</p> : null}
          <div className="ow-swatches" role="group" aria-label={workspace.t("labelColor")}>
            {COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className="ow-swatch"
                style={{ background: color.id }}
                aria-label={workspace.t(color.key)}
                aria-pressed={details.color === color.id}
                onClick={() => {
                  const next = details.color === color.id ? null : color.id;
                  void workspace.storage?.setColor(details.id, next).then(() => workspace.refreshFiles());
                }}
              />
            ))}
          </div>
        </aside>
      ) : null}
      {menu ? <ContextMenu x={menu.x} y={menu.y} title={menu.file.name} items={itemsFor(menu.file)} onClose={() => setMenu(null)} /> : null}
      <Modal open={moving !== null} title={workspace.t("moveTo")} onClose={() => setMoving(null)} footer={<Button onClick={() => setMoving(null)}>{workspace.t("closeDialog")}</Button>}>
        <Button onClick={() => { if (moving) void moveTo(moving.id, null).then(() => setMoving(null)); }}>{workspace.t("root")}</Button>
        {workspace.files.filter((item) => item.kind === "folder" && item.deletedAt === null && item.id !== moving?.id).map((folder) => (
          <Button key={folder.id} onClick={() => { if (moving) void moveTo(moving.id, folder.id).then(() => setMoving(null)); }}>{folder.name}</Button>
        ))}
      </Modal>
      <Modal
        open={rename !== null}
        title={workspace.t("renameTitle")}
        onClose={() => setRename(null)}
        footer={
          <>
            <Button onClick={() => setRename(null)}>{workspace.t("cancel")}</Button>
            <Button variant="primary" onClick={() => {
              if (!rename || !workspace.storage) return;
              void workspace.storage.renameFile(rename.id, renameValue).then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastRenamed"))).catch(workspace.reportError);
              setRename(null);
            }}>{workspace.t("apply")}</Button>
          </>
        }
      >
        <Input label={workspace.t("fileName")} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
      </Modal>
      <Modal
        open={tagsFor !== null}
        title={workspace.t("tags")}
        onClose={() => setTagsFor(null)}
        footer={
          <>
            <Button onClick={() => setTagsFor(null)}>{workspace.t("cancel")}</Button>
            <Button variant="primary" onClick={() => {
              if (!tagsFor || !workspace.storage) return;
              const tags = tagsValue.split(",").map((tag) => tag.trim()).filter(Boolean);
              void workspace.storage.setTags(tagsFor.id, tags).then(() => workspace.refreshFiles()).catch(workspace.reportError);
              setTagsFor(null);
            }}>{workspace.t("apply")}</Button>
          </>
        }
      >
        <Input label={workspace.t("tagsHint")} value={tagsValue} onChange={(event) => setTagsValue(event.target.value)} />
      </Modal>
      <Dialog
        open={confirm !== null}
        title={workspace.t("purge")}
        body={confirm === "all" ? workspace.t("purgeAllConfirm") : workspace.t("purgeConfirm")}
        confirmLabel={workspace.t("purge")}
        cancelLabel={workspace.t("cancel")}
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!workspace.storage) return;
          const task = confirm === "all"
            ? Promise.all(workspace.files.filter((file) => file.deletedAt).map((file) => workspace.storage?.purgeFile(file.id)))
            : confirm ? workspace.storage.purgeFile(confirm.id) : Promise.resolve();
          void task.then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastPurged"))).catch((error: unknown) => {
            if (isWorkError(error)) workspace.reportError(error);
          });
          setConfirm(null);
        }}
      />
    </div>
  );
}
