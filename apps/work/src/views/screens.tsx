import { lazy, Suspense, useEffect, useState } from "react";

const DocsEditor = lazy(() => import("../docs/DocsEditor").then((module) => ({ default: module.DocsEditor })));
import { parseOrvdoc } from "../docs/orvdoc";
import { templateCategories, templates } from "../docs/templates";
import { useWorkspace } from "../app/workspace";
import { downloadBytes } from "../security/bytes";
import { isWorkError } from "../security/errors";
import { errorMessageKey } from "../i18n";
import { fileNameWithExtension } from "../security/names";
import type { FileRecord } from "../storage/types";
import { APP_VERSION } from "../version";
import { Button, Card, EmptyState, ErrorState, Select, TabPanel, Tabs } from "../ui/kit";
import { Dialog, FilePicker } from "../ui/overlay";

function kindLabel(kind: FileRecord["kind"], t: ReturnType<typeof useWorkspace>["t"]): string {
  if (kind === "folder") return t("kindFolder");
  if (kind === "doc") return t("kindDoc");
  if (kind === "sheet") return t("kindSheet");
  if (kind === "slide") return t("kindSlide");
  if (kind === "pdf") return t("kindPdf");
  return t("kindOther");
}

export function FileButton({ file, onOpen }: { file: FileRecord; onOpen: () => void }) {
  const { t } = useWorkspace();
  return (
    <button type="button" className="ow-file-row" onClick={onOpen}>
      <strong>{file.name}</strong>
      <span>{kindLabel(file.kind, t)}</span>
    </button>
  );
}

export function HomeScreen() {
  const workspace = useWorkspace();
  const recent = workspace.files.filter((file) => file.deletedAt === null).slice(0, 8);
  return (
    <div className="ow-page">
      <header className="ow-page-head">
        <img src="/avatar.png" alt="" width={72} height={72} />
        <div>
          <h1>{workspace.t("appName")}</h1>
          <p>{workspace.t("tagline")}</p>
          <p className="ow-privacy">{workspace.t("privacy")}</p>
        </div>
      </header>
      <h2>{workspace.t("quick")}</h2>
      <div className="ow-grid">
        <Card
          title={workspace.t("newDoc")}
          tool="docs"
          action={
            <Button variant="primary" onClick={() => void workspace.createDocument()}>
              {workspace.t("newDoc")}
            </Button>
          }
        />
        <Card
          title={workspace.t("newSheet")}
          tool="sheets"
          body={workspace.t("sheetLimit")}
          action={<Button onClick={() => void workspace.createSheet(null)}>{workspace.t("newSheet")}</Button>}
        />
        <Card
          title={workspace.t("newSlides")}
          tool="slides"
          body={workspace.t("slideHint")}
          action={<Button onClick={() => void workspace.createSlides(null)}>{workspace.t("newSlides")}</Button>}
        />
        <Card
          title={workspace.t("openPdf")}
          tool="pdf"
          body={workspace.t("laterPdfBody")}
          action={<Button onClick={() => void workspace.navigate("pdf")}>{workspace.t("openPdf")}</Button>}
        />
      </div>
      <h2>{workspace.t("recent")}</h2>
      {recent.length === 0 ? (
        <EmptyState
          title={workspace.t("emptyTitle")}
          body={workspace.t("emptyBody")}
          action={
            <Button variant="primary" onClick={() => void workspace.createDocument()}>
              {workspace.t("createFirst")}
            </Button>
          }
        />
      ) : (
        <div className="ow-list">
          {recent.map((file) => (
            <FileButton
              key={file.id}
              file={file}
              onOpen={() => workspace.openRecord(file)}
            />
          ))}
        </div>
      )}
      <TemplateLibrary />
    </div>
  );
}

export function TemplateLibrary() {
  const { t, createDocument, locale } = useWorkspace();
  return (
    <section>
      <h2>{t("templates")}</h2>
      {templateCategories.map((category) => (
        <div key={category.id}>
          <h3>{t(category.label)}</h3>
          <div className="ow-grid">
            {templates
              .filter((template) => template.category === category.id)
              .map((template) => (
                <Card
                  key={template.id}
                  title={t(template.titleKey)}
                  body={t(template.bodyKey)}
                  tool="docs"
                  action={
                    <Button
                      variant="primary"
                      onClick={() => void createDocument(template.build(locale), t(template.titleKey))}
                    >
                      {t("useTemplate")}
                    </Button>
                  }
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function LaterScreen({ view }: { view: "sheets" | "slides" | "pdf" }) {
  const { t, files, storage, reportError, navigate } = useWorkspace();
  const title = view === "sheets" ? t("laterSheetsTitle") : view === "slides" ? t("laterSlidesTitle") : t("laterPdfTitle");
  const body = view === "sheets" ? t("laterSheetsBody") : view === "slides" ? t("laterSlidesBody") : t("laterPdfBody");
  const pdfs = files.filter((file) => file.deletedAt === null && file.kind === "pdf");
  return (
    <div className="ow-page" data-tool={view}>
      <p className="ow-kicker">{t("laterPhase")}</p>
      <h1>{title}</h1>
      <p>{body}</p>
      <Button onClick={() => void navigate("home")}>{t("backHome")}</Button>
      {view === "pdf" ? (
        <div className="ow-list">
          {pdfs.length === 0 ? <p>{t("noPdf")}</p> : null}
          {pdfs.map((file) => (
            <Button
              key={file.id}
              onClick={() => {
                if (!storage) return;
                void storage
                  .exportFile(file.id)
                  .then((exported) => downloadBytes(exported.bytes, exported.filename, "application/pdf"))
                  .catch(reportError);
              }}
            >
              {t("pdfDownload")}: {file.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocsScreen() {
  const workspace = useWorkspace();
  const docs = workspace.files.filter((file) => file.deletedAt === null && file.kind === "doc");
  const [loaded, setLoaded] = useState<{ id: string; record: FileRecord; doc: ReturnType<typeof parseOrvdoc> } | null>(null);
  const [error, setError] = useState<{ reason: string; bytes?: Uint8Array; name?: string } | null>(null);

  useEffect(() => {
    if (!workspace.openDocId || !workspace.storage) {
      setLoaded(null);
      return;
    }
    const id = workspace.openDocId;
    let cancel = false;
    setError(null);
    workspace.storage
      .loadFile(id)
      .then((loadedFile) => {
        if (cancel) return;
        if (loadedFile.integrity === "mismatch") {
          setError({ reason: workspace.t("reasonCorrupt"), bytes: loadedFile.bytes, name: loadedFile.record.name });
          setLoaded(null);
          return;
        }
        try {
          const doc = parseOrvdoc(loadedFile.bytes);
          setLoaded({ id, record: loadedFile.record, doc });
        } catch (cause) {
          const reason = isWorkError(cause) ? workspace.t(errorMessageKey(cause.code)) : workspace.t("reasonInvalid");
          setError({ reason, bytes: loadedFile.bytes, name: loadedFile.record.name });
        }
      })
      .catch((cause: unknown) => {
        if (cancel) return;
        const reason = isWorkError(cause) ? workspace.t(errorMessageKey(cause.code)) : workspace.t("reasonGeneric");
        setError({ reason });
      });
    return () => {
      cancel = true;
    };
  }, [workspace.openDocId, workspace.storage, workspace.t, workspace.locale]);

  if (!workspace.openDocId) {
    return (
      <div className="ow-page">
        <h1>ORVUPI Docs</h1>
        <p>{workspace.t("docsIntro")}</p>
        <Button variant="primary" onClick={() => void workspace.createDocument()}>
          {workspace.t("newDoc")}
        </Button>
        {docs.length === 0 ? (
          <EmptyState title={workspace.t("docsEmpty")} body={workspace.t("emptyBody")} />
        ) : (
          <div className="ow-list">
            {docs.map((file) => (
              <FileButton key={file.id} file={file} onOpen={() => workspace.openDoc(file.id)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={workspace.t("openErrorTitle")}
        reason={error.reason}
        solution={workspace.t("solutionExport")}
        retryLabel={workspace.t("retry")}
        onRetry={() => setError(null)}
        extra={
          error.bytes && error.name ? (
            <Button
              onClick={() => downloadBytes(error.bytes ?? new Uint8Array(), fileNameWithExtension(error.name ?? "archivo", "bin"), "application/octet-stream")}
            >
              {workspace.t("downloadRecovered")}
            </Button>
          ) : null
        }
      />
    );
  }

  if (!loaded || loaded.id !== workspace.openDocId || !workspace.storage) {
    return <p>{workspace.t("preparing")}</p>;
  }

  return (
    <Suspense fallback={<p>{workspace.t("preparing")}</p>}>
      <DocsEditor
        key={loaded.id}
        record={loaded.record}
        initial={loaded.doc}
        storage={workspace.storage}
        locale={workspace.locale}
        onSession={workspace.setSession}
        onFilesChanged={workspace.refreshFiles}
        onClose={workspace.closeDoc}
      />
    </Suspense>
  );
}

export function SettingsScreen() {
  const workspace = useWorkspace();
  const [tab, setTab] = useState("general");
  const [restoreOpen, setRestoreOpen] = useState<File | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  useEffect(() => {
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const activeCount = workspace.files.filter((file) => file.deletedAt === null).length;
  return (
    <div className="ow-page">
      <h1>{workspace.t("settings")}</h1>
      <Tabs
        label={workspace.t("settings")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "general", label: workspace.t("settingsGeneral") },
          { id: "storage", label: workspace.t("settingsStorage") },
          { id: "about", label: workspace.t("settingsAbout") },
        ]}
      />
      {tab === "general" ? (
        <TabPanel id="general">
          <Select label={workspace.t("language")} value={workspace.locale} onChange={(event) => void workspace.setLocale(event.target.value === "en" ? "en" : "es")}>
            <option value="es">{workspace.t("spanish")}</option>
            <option value="en">{workspace.t("english")}</option>
          </Select>
          <p>{workspace.t("privacy")}</p>
          <p>{workspace.t("offline")}</p>
        </TabPanel>
      ) : null}
      {tab === "storage" ? (
        <TabPanel id="storage">
          <p>
            <strong>{workspace.t("driver")}</strong> {workspace.driver === "opfs" ? workspace.t("driverOpfs") : workspace.t("driverIdb")}
          </p>
          <p>
            {workspace.t("fileCount")}: {activeCount}
          </p>
          <p>
            {workspace.t("usedSpace")}: {workspace.usedLabel}
          </p>
          <p>{workspace.t("backupHelp")}</p>
          <div className="ow-row">
            <Button variant="primary" onClick={() => void workspace.exportBackup()}>
              {workspace.t("exportBackup")}
            </Button>
            <FilePicker
              label={workspace.t("restoreBackup")}
              accept="application/json,.json"
              onFile={(file) => setRestoreOpen(file)}
            />
          </div>
          <h2>{workspace.t("install")}</h2>
          <Button
            variant="primary"
            onClick={() => {
              if (!installEvent) return;
              void installEvent.prompt().then(() => setInstallEvent(null));
            }}
            disabled={!installEvent || standalone}
          >
            {installEvent && !standalone ? workspace.t("installReady") : workspace.t("installDone")}
          </Button>
          <p>{workspace.t("installHelp")}</p>
        </TabPanel>
      ) : null}
      {tab === "about" ? (
        <TabPanel id="about">
          <p>
            {workspace.t("version")}: {APP_VERSION}
          </p>
          <p>
            {workspace.t("channel")}
          </p>
          <p>{workspace.t("aboutBody")}</p>
          <p>{workspace.t("aboutLocal")}</p>
          <p>{workspace.t("channelNote")}</p>
          <p>{workspace.t("privacy")}</p>
        </TabPanel>
      ) : null}
      <Dialog
        open={restoreOpen !== null}
        title={workspace.t("restoreBackup")}
        body={workspace.t("restoreWarn")}
        confirmLabel={workspace.t("confirmRestore")}
        cancelLabel={workspace.t("cancel")}
        onClose={() => setRestoreOpen(null)}
        onConfirm={() => {
          if (restoreOpen) void workspace.restoreBackup(restoreOpen);
          setRestoreOpen(null);
        }}
      />
    </div>
  );
}

export function SearchResults() {
  const workspace = useWorkspace();
  const needle = workspace.query.trim().toLowerCase();
  const matches = workspace.files.filter((file) => file.deletedAt === null && file.name.toLowerCase().includes(needle));
  return (
    <div className="ow-page">
      <h1>{workspace.t("resultsTitle")}</h1>
      {matches.length === 0 ? (
        <EmptyState title={workspace.t("resultsEmpty")} body={workspace.t("searchPlaceholder")} />
      ) : (
        <div className="ow-list">
          {matches.map((file) => (
            <FileButton
              key={file.id}
              file={file}
              onOpen={() => {
                workspace.setQuery("");
                workspace.openRecord(file);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
