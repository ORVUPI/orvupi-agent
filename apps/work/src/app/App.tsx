import { useEffect, useMemo, useState } from "react";
import type { ExportKind } from "../docs/DocsEditor";
import { ProgressBar } from "../ui/kit";
import { AiPanel } from "../ui/AiPanel";
import { CommandPalette, type Command } from "../ui/CommandPalette";
import { ShellFrame, Sidebar, Topbar, type NavItem } from "../ui/chrome";
import { Icon } from "../ui/icons";
import { Dropdown, Modal, Toasts } from "../ui/overlay";
import { ErrorState } from "../ui/kit";
import { DrawingsScreen } from "../drawings/DrawingsScreen";
import { FilesScreen } from "../files/FilesScreen";
import { FormsScreen } from "../forms/FormsScreen";
import { NotesScreen } from "../notes/NotesScreen";
import { SheetsScreen } from "../sheets/SheetScreen";
import { SlidesScreen } from "../slides/SlidesScreen";
import { DocsScreen, HomeScreen, LaterScreen, SearchResults, SettingsScreen, TemplateLibrary } from "../views/screens";
import { useWorkspace, type ViewId } from "./workspace";

export function App() {
  const workspace = useWorkspace();
  const [helpOpen, setHelpOpen] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);
  const items: NavItem[] = [
    { id: "home", label: workspace.t("navHome"), icon: "home", tool: "files" },
    { id: "drive", label: workspace.t("navFiles"), icon: "drive", tool: "files" },
    { id: "recent", label: workspace.t("filesRecent"), icon: "clock", tool: "files" },
    { id: "starred", label: workspace.t("filesStarred"), icon: "star", tool: "files" },
    { id: "trash", label: workspace.t("filesTrash"), icon: "trash", tool: "files" },
    { id: "docs", label: workspace.t("navDocs"), icon: "docs", tool: "docs" },
    { id: "sheets", label: workspace.t("navSheets"), icon: "sheets", tool: "sheets" },
    { id: "slides", label: workspace.t("navSlides"), icon: "slides", tool: "slides" },
    { id: "forms", label: workspace.t("navForms"), icon: "forms", tool: "forms" },
    { id: "drawings", label: workspace.t("navDrawings"), icon: "drawings", tool: "drawings" },
    { id: "notes", label: workspace.t("navNotes"), icon: "notes", tool: "notes" },
    { id: "pdf", label: workspace.t("navPdf"), icon: "pdf", tool: "pdf" },
    { id: "templates", label: workspace.t("navTemplates"), icon: "templates", tool: "docs" },
    { id: "ai", label: workspace.t("navAi"), icon: "ai", tool: "ai" },
    { id: "settings", label: workspace.t("navSettings"), icon: "settings", tool: "files" },
  ];

  useEffect(() => {
    void navigator.storage?.estimate?.().then((estimate) => setQuota(estimate.quota ?? null)).catch(() => setQuota(null));
  }, [workspace.files]);

  useEffect(() => {
    let chord: { key: string; at: number } | null = null;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (!typing && event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        document.getElementById("ow-search")?.focus();
        return;
      }
      if (typing) return;
      const letter = event.key.toLowerCase();
      if (event.altKey && (letter === "c" || letter === "v")) {
        chord = { key: letter, at: Date.now() };
        return;
      }
      if (!chord || Date.now() - chord.at > 1500) return;
      const which = chord.key;
      chord = null;
      if (which === "v" && letter === "l") {
        window.dispatchEvent(new CustomEvent("ow-drive", { detail: "toggle-layout" }));
        return;
      }
      if (which === "v" && letter === "d") {
        window.dispatchEvent(new CustomEvent("ow-drive", { detail: "toggle-details" }));
        return;
      }
      if (which === "c" && letter === "f") window.dispatchEvent(new CustomEvent("ow-drive", { detail: "new-folder" }));
      if (which === "c" && letter === "d") void workspace.createDocument(undefined, undefined, workspace.folderId);
      if (which === "c" && letter === "s") void workspace.createSheet(workspace.folderId);
      if (which === "c" && letter === "p") void workspace.createSlides(workspace.folderId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workspace]);

  const exportItems = useMemo(() => {
    if (workspace.session) {
      const kinds: Array<{ id: ExportKind; label: string }> = [
        { id: "pdf", label: workspace.t("exportPdf") },
        { id: "html", label: workspace.t("exportHtml") },
        { id: "txt", label: workspace.t("exportTxt") },
        { id: "orvdoc", label: workspace.t("exportOrvdoc") },
        { id: "docx", label: workspace.t("exportDocx") },
      ];
      return kinds.map((kind) => ({
        id: kind.id,
        label: kind.label,
        onSelect: () => void workspace.session?.exportAs(kind.id).catch(workspace.reportError),
      }));
    }
    return [{ id: "backup", label: workspace.t("exportBackup"), onSelect: () => void workspace.exportBackup() }];
  }, [workspace]);

  const commands = useMemo<Command[]>(
    () => [
      { id: "new", label: workspace.t("commandNew"), keywords: "doc documento", run: () => void workspace.createDocument() },
      { id: "sheet", label: workspace.t("newSheet"), keywords: "hoja sheet", run: () => void workspace.createSheet(null) },
      { id: "slides", label: workspace.t("newSlides"), keywords: "presentacion slides", run: () => void workspace.createSlides(null) },
      { id: "form", label: workspace.t("newForm"), keywords: "formulario form", run: () => void workspace.createForm(null) },
      { id: "drawing", label: workspace.t("newDrawing"), keywords: "dibujo drawing", run: () => void workspace.createDrawing(null) },
      { id: "note", label: workspace.t("newNote"), keywords: "nota note", run: () => void workspace.createNote(null) },
      { id: "home", label: workspace.t("commandHome"), run: () => void workspace.navigate("home") },
      { id: "docs", label: workspace.t("commandDocs"), run: () => void workspace.navigate("docs") },
      { id: "files", label: workspace.t("commandFiles"), run: () => void workspace.navigate("files") },
      { id: "settings", label: workspace.t("commandSettings"), run: () => void workspace.navigate("settings") },
      { id: "backup", label: workspace.t("commandBackup"), run: () => void workspace.exportBackup() },
      { id: "ai", label: workspace.t("commandAi"), run: () => workspace.setAiOpen(true) },
    ],
    [workspace],
  );

  const aiActions =
    workspace.openDocId
      ? [workspace.t("aiCorrect"), workspace.t("aiSummarize"), workspace.t("aiRewrite"), workspace.t("aiTranslate"), workspace.t("aiExplain")]
      : workspace.view === "pdf"
        ? [workspace.t("aiPdfSummary"), workspace.t("aiPdfPoints"), workspace.t("aiPdfExplain")]
        : workspace.view === "sheets"
          ? [workspace.t("aiSheetsAnalyze"), workspace.t("aiSheetsExplain"), workspace.t("aiSheetsFormula"), workspace.t("aiSheetsAnomaly"), workspace.t("aiSheetsSummary")]
          : [workspace.t("aiSummarize"), workspace.t("aiExplain")];

  const tier =
    workspace.capabilities.tier === "high"
      ? workspace.t("aiTierHigh")
      : workspace.capabilities.tier === "medium"
        ? workspace.t("aiTierMedium")
        : workspace.t("aiTierNone");

  let content = <HomeScreen />;
  if (workspace.query.trim()) content = <SearchResults />;
  else if (workspace.view === "docs") content = <DocsScreen />;
  else if (workspace.view === "files") content = <FilesScreen />;
  else if (workspace.view === "settings") content = <SettingsScreen />;
  else if (workspace.view === "templates") content = <div className="ow-page"><h1>{workspace.t("templates")}</h1><TemplateLibrary /></div>;
  else if (workspace.view === "sheets") content = <SheetsScreen />;
  else if (workspace.view === "slides") content = <SlidesScreen />;
  else if (workspace.view === "forms") content = <FormsScreen />;
  else if (workspace.view === "drawings") content = <DrawingsScreen />;
  else if (workspace.view === "notes") content = <NotesScreen />;
  else if (workspace.view === "pdf") content = <LaterScreen view="pdf" />;
  else if (workspace.view === "ai") content = <div className="ow-page"><h1>{workspace.t("aiTitle")}</h1><p>{workspace.t("aiBody")}</p><p>{tier}</p></div>;

  if (workspace.bootError) {
    content = (
      <ErrorState
        title={workspace.t("bootTitle")}
        reason={workspace.t("bootReason")}
        solution={workspace.t("bootSolution")}
        retryLabel={workspace.t("retry")}
        onRetry={workspace.retryBoot}
      />
    );
  } else if (!workspace.ready) {
    content = <ProgressBar label={workspace.t("preparing")} />;
  }

  return (
    <ShellFrame
      className={workspace.openDocId ? "is-doc" : ""}
      skip={workspace.t("skip")}
      sidebar={
        <Sidebar
          brand={workspace.t("appName")}
          brandAlt={workspace.t("brandAlt")}
          items={items}
          current={workspace.view === "files" ? (workspace.browse === "folder" ? "drive" : workspace.browse) : workspace.view}
          open={workspace.navOpen}
          onNavigate={(id) => {
            if (id === "drive") void workspace.showBrowse("folder");
            else if (id === "recent") void workspace.showBrowse("recent");
            else if (id === "starred") void workspace.showBrowse("starred");
            else if (id === "trash") void workspace.showBrowse("trash");
            else if (id === "ai") {
              workspace.setAiOpen(true);
              void workspace.navigate("ai");
            } else void workspace.navigate(id as ViewId);
          }}
          onClose={() => workspace.setNavOpen(false)}
          closeLabel={workspace.t("closeMenu")}
          navLabel={workspace.t("navLabel")}
          action={
            <div className="ow-new">
              <Dropdown
                label={workspace.t("newMenu")}
                items={[
                  { id: "folder", label: workspace.t("newFolder"), onSelect: () => window.dispatchEvent(new CustomEvent("ow-drive", { detail: "new-folder" })) },
                  { id: "doc", label: workspace.t("menuDocument"), onSelect: () => void workspace.createDocument(undefined, undefined, workspace.folderId) },
                  { id: "sheet", label: workspace.t("menuSheet"), onSelect: () => void workspace.createSheet(workspace.folderId) },
                  { id: "slides", label: workspace.t("menuSlides"), onSelect: () => void workspace.createSlides(workspace.folderId) },
                  { id: "form", label: workspace.t("menuForm"), onSelect: () => void workspace.createForm(workspace.folderId) },
                  { id: "drawing", label: workspace.t("menuDrawing"), onSelect: () => void workspace.createDrawing(workspace.folderId) },
                  { id: "note", label: workspace.t("menuNote"), onSelect: () => void workspace.createNote(workspace.folderId) },
                ]}
              />
              <label className="ow-file">
                <input aria-label={workspace.t("uploadFile")} type="file" accept=".orvdoc,.json,.txt,.md,.html,.htm,.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void workspace.importUserFile(file, workspace.folderId);
                }} />
                <span className="ow-button">{workspace.t("uploadFile")}</span>
              </label>
              <label className="ow-file">
                <input aria-label={workspace.t("uploadFolder")} type="file" multiple ref={(node) => { if (node) node.setAttribute("webkitdirectory", ""); }} onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = "";
                  if (files.length > 0) void workspace.importTree(files, workspace.folderId);
                }} />
                <span className="ow-button">{workspace.t("uploadFolder")}</span>
              </label>
            </div>
          }
          footer={
            <button type="button" className="ow-storage" onClick={() => void workspace.navigate("settings")}>
              <span><Icon name="database" /> {workspace.t("navStorage")}</span>
              <span className="ow-meter" role="meter" aria-valuemin={0} aria-valuemax={quota ?? 1} aria-valuenow={Math.min(quota ?? 1, workspace.files.filter((file) => file.deletedAt === null).reduce((sum, file) => sum + file.size, 0))} aria-label={workspace.t("navStorage")}>
                <i style={{ width: `${quota ? Math.min(100, (workspace.files.filter((file) => file.deletedAt === null).reduce((sum, file) => sum + file.size, 0) / quota) * 100) : 8}%` }} />
              </span>
              <small>{workspace.t("storageOf", { used: workspace.usedLabel })}</small>
            </button>
          }
        />
      }
      topbar={workspace.openDocId ? null : (
        <Topbar
          menuLabel={workspace.t("menu")}
          onMenu={() => workspace.setNavOpen(true)}
          searchLabel={workspace.t("searchLabel")}
          searchPlaceholder={workspace.t("searchPlaceholder")}
          searchClear={workspace.t("searchClear")}
          query={workspace.query}
          onQuery={workspace.setQuery}
          fileName={workspace.session ? workspace.session.name : null}
          fileNameLabel={workspace.t("fileName")}
          onRename={(value) => workspace.session?.rename(value)}
          onCommitName={() => void workspace.session?.commitName().catch(workspace.reportError)}
          saveState={workspace.session?.saveState ?? null}
          saveLabel={workspace.session?.saveState === "pending" ? workspace.t("statusPending") : workspace.t("statusSaved")}
          importLabel={workspace.t("import")}
          onImport={(file) => void workspace.importUserFile(file)}
          exportLabel={workspace.t("export")}
          exportItems={exportItems}
          settingsLabel={workspace.t("settings")}
          onSettings={() => void workspace.navigate("settings")}
          aiLabel={workspace.t("openAi")}
          aiPressed={workspace.aiOpen}
          onAi={() => workspace.setAiOpen(!workspace.aiOpen)}
          closeDocLabel={workspace.t("closeDoc")}
          onCloseDoc={workspace.session ? () => void workspace.session?.close() : null}
          starred={workspace.files.find((file) => file.id === (workspace.openDocId ?? workspace.openSheetId ?? workspace.openSlideId ?? workspace.openFormId ?? workspace.openDrawingId ?? workspace.openNoteId))?.favorite ?? false}
          starLabel={workspace.t("star")}
          onStar={workspace.openDocId || workspace.openSheetId || workspace.openSlideId || workspace.openFormId || workspace.openDrawingId || workspace.openNoteId ? () => {
            const id = workspace.openDocId ?? workspace.openSheetId ?? workspace.openSlideId ?? workspace.openFormId ?? workspace.openDrawingId ?? workspace.openNoteId;
            const file = workspace.files.find((item) => item.id === id);
            if (!id || !file) return;
            void workspace.storage?.setFavorite(id, !file.favorite).then(() => workspace.refreshFiles()).catch(workspace.reportError);
          } : undefined}
          chips={workspace.view === "home" || workspace.view === "files" ? (
            <>
              <label className="ow-chip">
                {workspace.t("chipType")}
                <select aria-label={workspace.t("chipType")} value={workspace.kindFilter} onChange={(event) => workspace.setKindFilter(event.target.value as typeof workspace.kindFilter)}>
                  <option value="all">{workspace.t("allTypes")}</option>
                  <option value="folder">{workspace.t("kindFolder")}</option>
                  <option value="doc">{workspace.t("kindDoc")}</option>
                  <option value="sheet">{workspace.t("kindSheet")}</option>
                  <option value="slide">{workspace.t("kindSlide")}</option>
                  <option value="form">{workspace.t("kindForm")}</option>
                  <option value="drawing">{workspace.t("kindDrawing")}</option>
                  <option value="note">{workspace.t("kindNote")}</option>
                  <option value="pdf">{workspace.t("kindPdf")}</option>
                  <option value="other">{workspace.t("kindOther")}</option>
                </select>
              </label>
              <button type="button" className="ow-chip" disabled title={workspace.t("chipPeopleHint")}>{workspace.t("chipPeople")}</button>
              <label className="ow-chip">
                {workspace.t("chipModified")}
                <select aria-label={workspace.t("chipModified")} value={workspace.dateFilter} onChange={(event) => workspace.setDateFilter(event.target.value as typeof workspace.dateFilter)}>
                  <option value="any">{workspace.t("dateAny")}</option>
                  <option value="today">{workspace.t("dateToday")}</option>
                  <option value="week">{workspace.t("dateWeek")}</option>
                  <option value="month">{workspace.t("dateMonth")}</option>
                </select>
              </label>
            </>
          ) : null}
        />
      )}
      aside={
        <AiPanel
          open={workspace.aiOpen}
          title={workspace.t("aiTitle")}
          body={workspace.t("aiBody")}
          closeLabel={workspace.t("closeAi")}
          onClose={() => workspace.setAiOpen(false)}
          contextLabel={workspace.t("aiFor")}
          actions={aiActions}
          unavailable={workspace.t("aiUnavailable")}
          onAction={() => workspace.pushToast(workspace.t("aiUnavailable"))}
          capabilities={workspace.capabilities}
          labels={{
            webgpu: workspace.t("aiWebgpu"),
            memory: workspace.t("aiMemory"),
            browser: workspace.t("aiBrowser"),
            yes: workspace.t("aiYes"),
            no: workspace.t("aiNo"),
            unknown: workspace.t("aiUnknown"),
            tier,
          }}
        />
      }
    >
      {content}
      <CommandPalette
        open={workspace.paletteOpen}
        title={workspace.t("paletteTitle")}
        placeholder={workspace.t("palettePlaceholder")}
        empty={workspace.t("paletteEmpty")}
        commands={commands}
        onClose={() => workspace.setPaletteOpen(false)}
      />
      <Toasts items={workspace.toasts} onDismiss={workspace.dismissToast} />
      <Modal open={helpOpen} title={workspace.t("shortcuts")} onClose={() => setHelpOpen(false)} footer={<button type="button" className="ow-button" onClick={() => setHelpOpen(false)}>{workspace.t("closeDialog")}</button>}>
        <p>{workspace.t("shortcutsDriveBody")}</p>
        <p>{workspace.t("shortcutsBody")}</p>
      </Modal>
      <Modal open={workspace.busy !== null} title={workspace.t("appName")} onClose={() => undefined}>
        <ProgressBar label={workspace.busy ?? workspace.t("preparing")} />
      </Modal>
    </ShellFrame>
  );
}
