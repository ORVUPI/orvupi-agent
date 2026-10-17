import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useWorkspace } from "../app/workspace";
import { docToText } from "../docs/model";
import { parseOrvdoc } from "../docs/orvdoc";
import { breadcrumb, sortFiles, visibleFiles, type DateFilter, type FileBrowseMode, type FileSortKey } from "./query";
import { downloadBytes } from "../security/bytes";
import { isWorkError } from "../security/errors";
import { fileNameWithExtension } from "../security/names";
import type { FileKind, FileRecord } from "../storage/types";
import { Button, EmptyState, Input, Select } from "../ui/kit";
import { ContextMenu, Dialog, Modal, type MenuItem } from "../ui/overlay";

const COLORS = [
  { id: "#1d4e89", key: "colorBlue" },
  { id: "#0b5d36", key: "colorGreen" },
  { id: "#9a3412", key: "colorOrange" },
  { id: "#a3123f", key: "colorRed" },
  { id: "#5b2a86", key: "colorViolet" },
  { id: "#7a4a00", key: "colorAmber" },
] as const;

function kindKey(kind: FileKind): "kindFolder" | "kindDoc" | "kindSheet" | "kindSlide" | "kindPdf" | "kindOther" {
  if (kind === "folder") return "kindFolder";
  if (kind === "doc") return "kindDoc";
  if (kind === "sheet") return "kindSheet";
  if (kind === "slide") return "kindSlide";
  if (kind === "pdf") return "kindPdf";
  return "kindOther";
}

export function FilesScreen() {
  const workspace = useWorkspace();
  const [mode, setMode] = useState<FileBrowseMode>("folder");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [sortKey, setSortKey] = useState<FileSortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [kind, setKind] = useState<"all" | FileKind>("all");
  const [date, setDate] = useState<DateFilter>("any");
  const [menu, setMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [rename, setRename] = useState<FileRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tagsFor, setTagsFor] = useState<FileRecord | null>(null);
  const [tagsValue, setTagsValue] = useState("");
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [confirm, setConfirm] = useState<FileRecord | "all" | null>(null);

  const crumbs = breadcrumb(workspace.files, folderId);
  const visible = useMemo(
    () =>
      sortFiles(
        visibleFiles(workspace.files, { mode, folderId, query: workspace.query, kind, date }),
        sortKey,
        direction,
      ),
    [workspace.files, workspace.query, mode, folderId, kind, date, sortKey, direction],
  );

  useEffect(() => {
    if (!preview || !workspace.storage) {
      setPreviewText("");
      setPreviewUrl("");
      return;
    }
    let url = "";
    let cancel = false;
    workspace.storage
      .loadFile(preview.id)
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
  }, [preview, workspace.storage, workspace.t]);

  function openFile(file: FileRecord) {
    if (file.deletedAt) return;
    if (file.kind === "folder") {
      setMode("folder");
      setFolderId(file.id);
      setPreview(null);
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
    for (const file of files) void workspace.importUserFile(file, parentId);
  }

  const itemsFor = (file: FileRecord): MenuItem[] => [
    { id: "open", label: workspace.t("open"), onSelect: () => openFile(file) },
    { id: "preview", label: workspace.t("preview"), onSelect: () => setPreview(file) },
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
    {
      id: "download",
      label: workspace.t("download"),
      onSelect: () => void workspace.storage?.exportFile(file.id).then((fileExport) => downloadBytes(fileExport.bytes, fileExport.filename, fileExport.record.mime)).catch(workspace.reportError),
    },
    {
      id: "trash",
      label: file.deletedAt ? workspace.t("restore") : workspace.t("remove"),
      onSelect: () => {
        const action = file.deletedAt ? workspace.storage?.restoreFile(file.id) : workspace.storage?.deleteFile(file.id);
        void action?.then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t(file.deletedAt ? "toastRestoredFile" : "toastDeleted"))).catch(workspace.reportError);
      },
    },
  ];

  return (
    <div className="ow-page" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, mode === "folder" ? folderId : null)}>
      <header className="ow-page-head">
        <div>
          <h1>{workspace.t("navFiles")}</h1>
          <p>{workspace.t("dropFiles")}</p>
        </div>
      </header>
      <div className="ow-row" role="tablist" aria-label={workspace.t("navFiles")}>
        {([
          ["folder", workspace.t("filesMy")],
          ["recent", workspace.t("filesRecent")],
          ["starred", workspace.t("filesStarred")],
          ["trash", workspace.t("filesTrash")],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className="ow-button" aria-pressed={mode === id} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>
      {mode === "folder" ? (
        <nav className="ow-row" aria-label={workspace.t("root")} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, null)}>
          <button type="button" className="ow-button ow-button-ghost" onClick={() => setFolderId(null)}>
            {workspace.t("root")}
          </button>
          {crumbs.map((crumb) => (
            <button key={crumb.id} type="button" className="ow-button ow-button-ghost" onClick={() => setFolderId(crumb.id)}>
              {crumb.name}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="ow-row">
        {mode === "folder" ? (
          <>
            <Button
              variant="primary"
              onClick={() => {
                const name = workspace.t("newFolder");
                void workspace.storage?.createFolder(name, folderId).then(() => workspace.refreshFiles()).catch(workspace.reportError);
              }}
            >
              {workspace.t("newFolder")}
            </Button>
            <Button onClick={() => void workspace.createDocument(undefined, undefined, folderId)}>{workspace.t("newDoc")}</Button>
            <Button onClick={() => void workspace.createSheet(folderId)}>{workspace.t("newSheet")}</Button>
            <Button onClick={() => void workspace.createSlides(folderId)}>{workspace.t("newSlides")}</Button>
          </>
        ) : null}
        <Button aria-pressed={layout === "list"} onClick={() => setLayout("list")}>{workspace.t("viewList")}</Button>
        <Button aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}>{workspace.t("viewGrid")}</Button>
      </div>
      <div className="ow-row">
        <Select label={workspace.t("sortBy")} value={sortKey} onChange={(event) => setSortKey(event.target.value as FileSortKey)}>
          <option value="name">{workspace.t("sortName")}</option>
          <option value="updated">{workspace.t("sortUpdated")}</option>
          <option value="created">{workspace.t("sortCreated")}</option>
          <option value="size">{workspace.t("sortSize")}</option>
          <option value="kind">{workspace.t("sortKind")}</option>
        </Select>
        <Button onClick={() => setDirection((value) => (value === "asc" ? "desc" : "asc"))}>{direction === "asc" ? "A–Z" : "Z–A"}</Button>
        <Select label={workspace.t("filterKind")} value={kind} onChange={(event) => setKind(event.target.value as "all" | FileKind)}>
          <option value="all">{workspace.t("allTypes")}</option>
          <option value="folder">{workspace.t("kindFolder")}</option>
          <option value="doc">{workspace.t("kindDoc")}</option>
          <option value="sheet">{workspace.t("kindSheet")}</option>
          <option value="slide">{workspace.t("kindSlide")}</option>
          <option value="pdf">{workspace.t("kindPdf")}</option>
          <option value="other">{workspace.t("kindOther")}</option>
        </Select>
        <Select label={workspace.t("filterDate")} value={date} onChange={(event) => setDate(event.target.value as DateFilter)}>
          <option value="any">{workspace.t("dateAny")}</option>
          <option value="today">{workspace.t("dateToday")}</option>
          <option value="week">{workspace.t("dateWeek")}</option>
          <option value="month">{workspace.t("dateMonth")}</option>
        </Select>
      </div>
      {visible.length === 0 ? <EmptyState title={mode === "trash" ? workspace.t("trashEmpty") : workspace.t("filesEmpty")} body={workspace.t("emptyBody")} /> : null}
      <div className={layout === "grid" ? "ow-grid" : "ow-list"}>
        {visible.map((file) => (
          <article
            key={file.id}
            className="ow-file-card"
            style={{ borderColor: file.color ?? undefined }}
            draggable={file.deletedAt === null}
            onDragStart={(event) => event.dataTransfer.setData("application/x-orvupi-id", file.id)}
            onDragOver={(event) => {
              if (file.kind === "folder") event.preventDefault();
            }}
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
            <button type="button" className="ow-file-open" onClick={() => openFile(file)}>
              <strong>{file.favorite ? "★ " : ""}{file.name}</strong>
              <span>{workspace.t(kindKey(file.kind))}</span>
            </button>
            {file.tags.length > 0 ? <p className="ow-muted">{file.tags.join(" · ")}</p> : null}
            <div className="ow-row">
              <Button onClick={() => setPreview(file)}>{workspace.t("preview")}</Button>
              <Button onClick={() => { setRename(file); setRenameValue(file.name); }}>{workspace.t("rename")}</Button>
              {file.deletedAt ? (
                <Button onClick={() => void workspace.storage?.restoreFile(file.id).then(() => workspace.refreshFiles())}>{workspace.t("restore")}</Button>
              ) : (
                <Button onClick={() => void workspace.storage?.deleteFile(file.id).then(() => workspace.refreshFiles())}>{workspace.t("remove")}</Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {mode === "trash" && visible.length > 0 ? <Button variant="danger" onClick={() => setConfirm("all")}>{workspace.t("purgeAll")}</Button> : null}
      {preview ? (
        <aside className="ow-preview" aria-label={workspace.t("preview")}>
          <header className="ow-row">
            <h2>{preview.name}</h2>
            <Button onClick={() => setPreview(null)}>{workspace.t("closeDialog")}</Button>
          </header>
          {previewUrl ? <img src={previewUrl} alt={preview.name} /> : <pre>{previewText}</pre>}
          {preview.kind === "pdf" ? (
            <Button
              onClick={() => {
                void workspace.storage?.exportFile(preview.id).then((fileExport) => downloadBytes(fileExport.bytes, fileNameWithExtension(preview.name, "pdf"), "application/pdf"));
              }}
            >
              {workspace.t("pdfDownload")}
            </Button>
          ) : null}
          <div className="ow-swatches" role="group" aria-label={workspace.t("labelColor")}>
            {COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className="ow-swatch"
                style={{ background: color.id }}
                aria-label={workspace.t(color.key)}
                aria-pressed={preview.color === color.id}
                onClick={() => {
                  void workspace.storage?.setColor(preview.id, preview.color === color.id ? null : color.id).then(() => workspace.refreshFiles()).then(() => setPreview({ ...preview, color: preview.color === color.id ? null : color.id }));
                }}
              />
            ))}
          </div>
        </aside>
      ) : null}
      {menu ? <ContextMenu x={menu.x} y={menu.y} items={itemsFor(menu.file)} onClose={() => setMenu(null)} /> : null}
      <Modal
        open={rename !== null}
        title={workspace.t("renameTitle")}
        onClose={() => setRename(null)}
        footer={
          <>
            <Button onClick={() => setRename(null)}>{workspace.t("cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!rename || !workspace.storage) return;
                void workspace.storage.renameFile(rename.id, renameValue).then(() => workspace.refreshFiles()).then(() => workspace.pushToast(workspace.t("toastRenamed"))).catch(workspace.reportError);
                setRename(null);
              }}
            >
              {workspace.t("apply")}
            </Button>
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
            <Button
              variant="primary"
              onClick={() => {
                if (!tagsFor || !workspace.storage) return;
                const tags = tagsValue.split(",").map((tag) => tag.trim()).filter(Boolean);
                void workspace.storage.setTags(tagsFor.id, tags).then(() => workspace.refreshFiles()).catch(workspace.reportError);
                setTagsFor(null);
              }}
            >
              {workspace.t("apply")}
            </Button>
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
