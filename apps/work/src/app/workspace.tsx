import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectCapabilities, type CapabilitySnapshot } from "../ai/capabilities";
import type { DocSession, ExportKind } from "../docs/DocsEditor";
import { prepareImport } from "../docs/incoming";
import type { JsonNode } from "../docs/model";
import { createOrvdoc, serializeOrvdoc } from "../docs/orvdoc";
import { createSheetFile, serializeSheet } from "../sheets/model";
import { createSlidesFile, serializeSlides } from "../slides/model";
import { errorMessageKey, translate, type Locale, type MessageKey } from "../i18n";
import { downloadBytes } from "../security/bytes";
import { isWorkError, WorkError } from "../security/errors";
import { fileNameWithExtension, formatBytes, createId } from "../security/names";
import { createBrowserStorage } from "../storage/browser";
import type { FileRecord, StorageService } from "../storage/types";

export type ViewId = "home" | "docs" | "sheets" | "slides" | "pdf" | "files" | "ai" | "templates" | "settings";

type Toast = { id: string; message: string };

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
  openDoc: (id: string) => void;
  openSheet: (id: string) => void;
  openSlide: (id: string) => void;
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
  pushToast: (message: string) => void;
  session: DocSession | null;
  setSession: (session: DocSession | null) => void;
  driver: "opfs" | "indexeddb" | null;
  capabilities: CapabilitySnapshot;
  busy: string | null;
  storage: StorageService | null;
  createDocument: (content?: JsonNode, name?: string, folderId?: string | null) => Promise<void>;
  createSheet: (folderId?: string | null) => Promise<void>;
  createSlides: (folderId?: string | null) => Promise<void>;
  importUserFile: (file: File, folderId?: string | null) => Promise<void>;
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<StorageService | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [locale, setLocaleState] = useState<Locale>("es");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [view, setView] = useState<ViewId>("home");
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);
  const [openSlideId, setOpenSlideId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [session, setSessionState] = useState<DocSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const capabilities = useMemo(() => detectCapabilities(), []);

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);

  const pushToast = useCallback((message: string) => {
    const id = createId();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!storage) return;
    setFiles(await storage.listFiles({ includeDeleted: true }));
  }, [storage]);

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
      setOpenSheetId(null);
      setOpenSlideId(null);
      setOpenDocId(id);
      setView("docs");
      setQuery("");
    },
    [storage, t],
  );

  const createSheet = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newSheet");
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
      setOpenDocId(null);
      setOpenSlideId(null);
      setOpenSheetId(id);
      setView("sheets");
      setQuery("");
    },
    [storage, t],
  );

  const createSlides = useCallback(
    async (folderId?: string | null) => {
      if (!storage) return;
      const id = createId();
      const title = t("newSlides");
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
      setOpenDocId(null);
      setOpenSheetId(null);
      setOpenSlideId(id);
      setView("slides");
      setQuery("");
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
        if (prepared.openAsDoc) {
          setOpenDocId(saved.id);
          setView("docs");
          pushToast(t("toastImported"));
        } else if (prepared.kind === "sheet") {
          setOpenDocId(null);
          setOpenSheetId(saved.id);
          setView("sheets");
          pushToast(t("toastImported"));
        } else {
          setOpenDocId(null);
          setView(prepared.kind === "pdf" ? "pdf" : "files");
          pushToast(t("toastStored"));
        }
      } catch (error) {
        reportError(error);
      }
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
      setNavOpen(false);
      setView(next);
    },
    openDocId,
    openSheetId,
    openSlideId,
    openDoc: (id) => {
      setOpenSheetId(null);
      setOpenSlideId(null);
      setOpenDocId(id);
      setView("docs");
      setQuery("");
      setNavOpen(false);
    },
    openSheet: (id) => {
      setOpenDocId(null);
      setOpenSlideId(null);
      setOpenSheetId(id);
      setView("sheets");
      setQuery("");
      setNavOpen(false);
    },
    openSlide: (id) => {
      setOpenDocId(null);
      setOpenSheetId(null);
      setOpenSlideId(id);
      setView("slides");
      setQuery("");
      setNavOpen(false);
    },
    openRecord: (file) => {
      if (file.kind === "doc") {
        setOpenSheetId(null);
        setOpenSlideId(null);
        setOpenDocId(file.id);
        setView("docs");
      } else if (file.kind === "sheet") {
        setOpenDocId(null);
        setOpenSlideId(null);
        setOpenSheetId(file.id);
        setView("sheets");
      } else if (file.kind === "slide") {
        setOpenDocId(null);
        setOpenSheetId(null);
        setOpenSlideId(file.id);
        setView("slides");
      } else if (file.kind === "pdf") {
        setView("pdf");
      } else {
        setView("files");
      }
      setQuery("");
      setNavOpen(false);
    },
    closeDoc: () => setOpenDocId(null),
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
    importUserFile,
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
