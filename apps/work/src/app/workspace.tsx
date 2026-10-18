import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectCapabilities, type CapabilitySnapshot } from "../ai/capabilities";
import type { DocSession, ExportKind } from "../docs/DocsEditor";
import { prepareImport } from "../docs/incoming";
import type { JsonNode } from "../docs/model";
import { createOrvdoc, serializeOrvdoc } from "../docs/orvdoc";
import { createDrawingFile, serializeDrawing } from "../drawings/model";
import { createFormFile, serializeForm } from "../forms/model";
import { createNoteFile, serializeNote } from "../notes/model";
import { createSheetFile, serializeSheet } from "../sheets/model";
import { createSlidesFile, serializeSlides } from "../slides/model";
import { errorMessageKey, translate, type Locale, type MessageKey } from "../i18n";
import { downloadBytes } from "../security/bytes";
import { isWorkError, WorkError } from "../security/errors";
import { fileNameWithExtension, formatBytes, createId } from "../security/names";
import { applyDocumentChrome, withBase, editorKind, editorPath, openEditorWindow, parseEditorPath, tabTitle, toolFavicon, viewForKind, type EditorKind } from "../routing/paths";
import { subscribeFilesChanged } from "../routing/sync";
import { createBrowserStorage } from "../storage/browser";
import type { FileBrowseMode, DateFilter } from "../files/query";
import type { FileKind, FileRecord, StorageService } from "../storage/types";

export type ViewId = "home" | "docs" | "sheets" | "slides" | "forms" | "drawings" | "notes" | "pdf" | "files" | "ai" | "templates" | "settings";

type Toast = { id: string; message: string; action?: { label: string; run: () => void } };

type WorkspaceValue = {
  ready: boolean;
  bootError: boolean;
  retryBoot: () => void;
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => Promise<void>;
  files: FileRecord[];
  view: ViewId;
  setView: (view: ViewId) => void;
  navigate: (view: ViewId) => Promise<void>;
  openDocId: string | null;
  openSheetId: string | null;
  openSlideId: string | null;
  openFormId: string | null;
  openDrawingId: string | null;
  openNoteId: string | null;
  openDoc: (id: string) => void;
  openSheet: (id: string) => void;
  openSlide: (id: string) => void;
  openForm: (id: string) => void;
  openDrawing: (id: string) => void;
  openNote: (id: string) => void;
  openRecord: (file: FileRecord) => void;
  closeDoc: () => void;
  query: string;
  setQuery: (value: string) => void;
  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  pushToast: (message: string, action?: { label: string; run: () => void }) => void;
  session: DocSession | null;
  setSession: (session: DocSession | null) => void;
  driver: "opfs" | "indexeddb" | null;
  capabilities: CapabilitySnapshot;
  busy: string | null;
  storage: StorageService | null;
  createDocument: (content?: JsonNode, name?: string, folderId?: string | null) => Promise<void>;
  createSheet: (folderId?: string | null) => Promise<void>;
  createSlides: (folderId?: string | null) => Promise<void>;
  createForm: (folderId?: string | null) => Promise<void>;
  createDrawing: (folderId?: string | null) => Promise<void>;
  createNote: (folderId?: string | null) => Promise<void>;
  importUserFile: (file: File, folderId?: string | null) => Promise<void>;
  importTree: (files: File[], folderId?: string | null) => Promise<void>;
  browse: FileBrowseMode;
  showBrowse: (mode: FileBrowseMode) => Promise<void>;
  kindFilter: "all" | FileKind;
  setKindFilter: (kind: "all" | FileKind) => void;
  dateFilter: DateFilter;
  setDateFilter: (date: DateFilter) => void;
  driveLayout: "list" | "grid";
  setDriveLayout: (layout: "list" | "grid") => void;
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
  folderId: string | null;
  setFolderId: (id: string | null) => void;
  exportBackup: () => Promise<void>;
  restoreBackup: (file: File) => Promise<void>;
  refreshFiles: () => Promise<void>;
  usedLabel: string;
  reportError: (error: unknown) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("workspace");
  return value;
}

function routeIds(pathname: string): { view: ViewId; doc: string | null; sheet: string | null; slide: string | null; form: string | null; drawing: string | null; note: string | null } {
  const route = parseEditorPath(pathname);
  return {
    view: route ? viewForKind(route.kind) : "home",
    doc: route?.kind === "doc" ? route.id : null,
    sheet: route?.kind === "sheet" ? route.id : null,
    slide: route?.kind === "slide" ? route.id : null,
    form: route?.kind === "form" ? route.id : null,
    drawing: route?.kind === "drawing" ? route.id : null,
    note: route?.kind === "note" ? route.id : null,
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const bootPath = typeof window === "undefined" ? "/" : window.location.pathname;
  const boot = routeIds(bootPath);
  const [storage, setStorage] = useState<StorageService | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [locale, setLocaleState] = useState<Locale>("es");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [view, setView] = useState<ViewId>(boot.view);
  const [openDocId, setOpenDocId] = useState<string | null>(boot.doc);
  const [openSheetId, setOpenSheetId] = useState<string | null>(boot.sheet);
  const [openSlideId, setOpenSlideId] = useState<string | null>(boot.slide);
  const [openFormId, setOpenFormId] = useState<string | null>(boot.form);
  const [openDrawingId, setOpenDrawingId] = useState<string | null>(boot.drawing);
  const [openNoteId, setOpenNoteId] = useState<string | null>(boot.note);
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState<FileBrowseMode>("folder");
  const [kindFilter, setKindFilter] = useState<"all" | FileKind>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [driveLayout, setDriveLayout] = useState<"list" | "grid">("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 840px), (pointer: coarse)").matches);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [session, setSessionState] = useState<DocSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const capabilities = useMemo(() => detectCapabilities(), []);

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);

  const pushToast = useCallback((message: string, action?: { label: string; run: () => void }) => {
    const id = createId();
    setToasts((current) => [...current, { id, message, action }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), action ? 8000 : 5000);
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!storage) return;
    setFiles(await storage.listFiles({ includeDeleted: true }));
  }, [storage]);

  const reveal = useCallback((kind: EditorKind, id: string) => {
    const opened = openEditorWindow(kind, id);
    if (opened === null) window.location.assign(editorPath(kind, id));
  }, []);

  const showPath = useCallback((pathname: string) => {
    const next = routeIds(pathname);
    setOpenDocId(next.doc);
    setOpenSheetId(next.sheet);
    setOpenSlideId(next.slide);
    setOpenFormId(next.form);
    setOpenDrawingId(next.drawing);
    setOpenNoteId(next.note);
    setView(next.view);
  }, []);

  useEffect(() => subscribeFilesChanged(() => void refreshFiles()), [refreshFiles]);

  useEffect(() => {
    const onPop = () => showPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [showPath]);

  useEffect(() => {
    const route = parseEditorPath(window.location.pathname);
    if (!route) {
      applyDocumentChrome("ORVUPI Work", withBase("/favicon-32.png"));
      return;
    }
    const listed = files.find((file) => file.id === route.id)?.name ?? "";
    const name = route.kind === "doc" && session && openDocId === route.id ? session.name : listed;
    applyDocumentChrome(tabTitle(name, route.kind), toolFavicon(route.kind));
  }, [files, session, openDocId, openSheetId, openSlideId, openFormId, openDrawingId, openNoteId]);

  useEffect(() => {
    if (!storage || !ready) return;
    const route = parseEditorPath(window.location.pathname);
    if (!route) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      void refreshFiles();
      if (tries > 20) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [storage, ready, refreshFiles]);

  useEffect(() => {
    let cancel = false;
    setReady(false);
    setBootError(false);
    createBrowserStorage()
      .then(async (service) => {
        if (cancel) return;
        const settings = await service.getSettings();
        if (cancel) return;
        setStorage(service);
        setLocaleState(settings.locale);
        setFiles(await service.listFiles({ includeDeleted: true }));
        setReady(true);
      })
      .catch(() => {
        if (!cancel) setBootError(true);
      });
    return () => {
      cancel = true;
    };
  }, [bootAttempt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setSession = useCallback((next: DocSession | null) => setSessionState(next), []);

  const reportError = useCallback(
    (error: unknown) => {
      const key = isWorkError(error) ? errorMessageKey(error.code) : "reasonGeneric";
      pushToast(t(key));
      if (import.meta.env.DEV) console.error(error);
    },
    [pushToast, t],
  );

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      document.documentElement.lang = next;
      if (storage) await storage.saveSettings({ locale: next });
    },
    [storage],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const createDocument = useCallback(
    async (content?: JsonNode, name?: string, folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = name?.trim() || t("untitled");
      const opened = openEditorWindow("doc", id);
      const file = createOrvdoc({ id, title, content });
      await storage.saveFile({
        id,
        name: title,
        kind: "doc",
        mime: "application/vnd.orvupi.doc+json",
        bytes: serializeOrvdoc(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("doc", id));
    },
    [storage, t],
  );

  const createSheet = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newSheet");
      const opened = openEditorWindow("sheet", id);
      const file = createSheetFile({ id, title });
      await storage.saveFile({
        id,
        name: title,
        kind: "sheet",
        mime: "application/vnd.orvupi.sheet+json",
        bytes: serializeSheet(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("sheet", id));
    },
    [storage, t],
  );

  const createSlides = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newSlides");
      const opened = openEditorWindow("slide", id);
      const file = createSlidesFile({ id, title });
      await storage.saveFile({
        id,
        name: title,
        kind: "slide",
        mime: "application/vnd.orvupi.slides+json",
        bytes: serializeSlides(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("slide", id));
    },
    [storage, t],
  );

  const createForm = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newForm");
      const opened = openEditorWindow("form", id);
      const file = createFormFile({ id, title });
      await storage.saveFile({
        id,
        name: title,
        kind: "form",
        mime: "application/vnd.orvupi.form+json",
        bytes: serializeForm(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("form", id));
    },
    [storage, t],
  );

  const createDrawing = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newDrawing");
      const opened = openEditorWindow("drawing", id);
      const file = createDrawingFile({ id, title });
      await storage.saveFile({
        id,
        name: title,
        kind: "drawing",
        mime: "application/vnd.orvupi.drawing+json",
        bytes: serializeDrawing(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("drawing", id));
    },
    [storage, t],
  );

  const createNote = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newNote");
      const opened = openEditorWindow("note", id);
      const file = createNoteFile({ id, title });
      await storage.saveFile({
        id,
        name: title,
        kind: "note",
        mime: "application/vnd.orvupi.note+json",
        bytes: serializeNote(file),
        folderId: folderId ?? null,
      });
      setFiles(await storage.listFiles({ includeDeleted: true }));
      setQuery("");
      if (opened === null) window.location.assign(editorPath("note", id));
    },
    [storage, t],
  );

  const importUserFile = useCallback(
    async (file: File, folderId?: string | null) => {
      if (!storage) return;
      try {
        const prepared = await prepareImport(file, t("untitled"));
        const saved = await storage.saveFile({
          name: prepared.name,
          kind: prepared.kind,
          mime: prepared.mime,
          bytes: prepared.bytes,
          folderId: folderId ?? null,
        });
        setFiles(await storage.listFiles({ includeDeleted: true }));
        const kind = editorKind(prepared.kind);
        if (kind) {
          const opened = openEditorWindow(kind, saved.id);
          if (opened === null) window.location.assign(editorPath(kind, saved.id));
          pushToast(t("toastImported"));
        } else {
          setView(prepared.kind === "pdf" ? "pdf" : "files");
          pushToast(t("toastStored"));
        }
      } catch (error) {
        reportError(error);
      }
    },
    [pushToast, reportError, storage, t],
  );

  const importTree = useCallback(
    async (list: File[], folderId?: string | null) => {
      if (!storage) return;
      const cache = new Map<string, string | null>();
      cache.set("", folderId ?? null);
      let stored = 0;
      for (const file of list.slice(0, 40)) {
        try {
          const relative = file.webkitRelativePath || file.name;
          const parts = relative.split("/").filter(Boolean);
          const folders = parts.slice(0, -1);
          let key = "";
          let parent = folderId ?? null;
          for (const part of folders) {
            const nextKey = key ? `${key}/${part}` : part;
            const known = cache.get(nextKey);
            if (typeof known === "string") {
              parent = known;
              key = nextKey;
              continue;
            }
            const created = await storage.createFolder(part, parent);
            cache.set(nextKey, created.id);
            parent = created.id;
            key = nextKey;
          }
          const prepared = await prepareImport(file, t("untitled"));
          await storage.saveFile({
            name: prepared.name,
            kind: prepared.kind,
            mime: prepared.mime,
            bytes: prepared.bytes,
            folderId: parent,
          });
          stored += 1;
        } catch (error) {
          reportError(error);
        }
      }
      setFiles(await storage.listFiles({ includeDeleted: true }));
      if (stored > 0) pushToast(t("toastStored"));
      setView("files");
    },
    [pushToast, reportError, storage, t],
  );

  const exportBackup = useCallback(async () => {
    if (!storage) return;
    setBusy(t("backupProgress"));
    try {
      const bytes = await storage.backupWorkspace();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBytes(bytes, `orvupi-workspace-${stamp}.json`, "application/json");
      pushToast(t("toastBackup"));
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(null);
    }
  }, [pushToast, reportError, storage, t]);

  const restoreBackup = useCallback(
    async (file: File) => {
      if (!storage) return;
      setBusy(t("restoreProgress"));
      try {
        if (file.size <= 0) throw new WorkError("invalid-format");
        const bytes = new Uint8Array(await file.arrayBuffer());
        await storage.restoreWorkspace(bytes);
        const settings = await storage.getSettings();
        setLocaleState(settings.locale);
        setFiles(await storage.listFiles({ includeDeleted: true }));
        setOpenDocId(null);
        setOpenSheetId(null);
        setOpenSlideId(null);
        setOpenFormId(null);
        setOpenDrawingId(null);
        setOpenNoteId(null);
        setView("home");
        pushToast(t("toastRestored"));
      } catch (error) {
        reportError(error);
      } finally {
        setBusy(null);
      }
    },
    [pushToast, reportError, storage, t],
  );

  const used = files.filter((file) => file.deletedAt === null).reduce((sum, file) => sum + file.size, 0);

  const value: WorkspaceValue = {
    ready,
    bootError,
    retryBoot: () => setBootAttempt((attempt) => attempt + 1),
    locale,
    t,
    setLocale,
    files,
    view,
    setView: (next) => {
      setNavOpen(false);
      setView(next);
    },
    navigate: async (next) => {
      if (openDocId && next !== "docs" && session) {
        const closed = await session.close();
        if (!closed) return;
      } else if (next !== "docs") {
        setOpenDocId(null);
      }
      if (next !== "sheets") setOpenSheetId(null);
      if (next !== "slides") setOpenSlideId(null);
      if (next !== "forms") setOpenFormId(null);
      if (next !== "drawings") setOpenDrawingId(null);
      if (next !== "notes") setOpenNoteId(null);
      if (parseEditorPath(window.location.pathname)) window.history.pushState({}, "", withBase("/"));
      setNavOpen(false);
      setView(next);
    },
    openDocId,
    openSheetId,
    openSlideId,
    openFormId,
    openDrawingId,
    openNoteId,
    openDoc: (id) => reveal("doc", id),
    openSheet: (id) => reveal("sheet", id),
    openSlide: (id) => reveal("slide", id),
    openForm: (id) => reveal("form", id),
    openDrawing: (id) => reveal("drawing", id),
    openNote: (id) => reveal("note", id),
    openRecord: (file) => {
      const target = file.shortcutOf ? files.find((item) => item.id === file.shortcutOf) ?? file : file;
      const kind = editorKind(target.kind);
      if (kind) {
        reveal(kind, target.id);
        return;
      }
      setView(file.kind === "pdf" ? "pdf" : "files");
      setQuery("");
      setNavOpen(false);
    },
    closeDoc: () => {
      if (window.opener) {
        window.close();
        return;
      }
      setOpenDocId(null);
      setView("home");
      window.history.pushState({}, "", withBase("/"));
    },
    query,
    setQuery,
    aiOpen,
    setAiOpen,
    navOpen,
    setNavOpen,
    paletteOpen,
    setPaletteOpen,
    toasts,
    dismissToast: (id) => setToasts((current) => current.filter((item) => item.id !== id)),
    pushToast,
    session,
    setSession,
    driver: storage?.driver ?? null,
    capabilities,
    busy,
    storage,
    createDocument,
    createSheet,
    createSlides,
    createForm,
    createDrawing,
    createNote,
    importUserFile,
    importTree,
    browse,
    showBrowse: async (mode) => {
      if (openDocId && session) {
        const closed = await session.close();
        if (!closed) return;
      } else {
        setOpenDocId(null);
      }
      setOpenSheetId(null);
      setOpenSlideId(null);
      setOpenFormId(null);
      setOpenDrawingId(null);
      setOpenNoteId(null);
      if (parseEditorPath(window.location.pathname)) window.history.pushState({}, "", withBase("/"));
      setBrowse(mode);
      setNavOpen(false);
      setView("files");
    },
    kindFilter,
    setKindFilter,
    dateFilter,
    setDateFilter,
    driveLayout,
    setDriveLayout,
    detailsOpen,
    setDetailsOpen,
    folderId,
    setFolderId,
    exportBackup,
    restoreBackup,
    refreshFiles,
    usedLabel: formatBytes(used, locale === "es" ? "es" : "en"),
    reportError,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function exportName(name: string, kind: ExportKind): string {
  const extension = kind === "orvdoc" ? "orvdoc" : kind;
  return fileNameWithExtension(name, extension);
}
