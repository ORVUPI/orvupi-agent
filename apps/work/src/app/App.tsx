import { useMemo } from "react";
import type { ExportKind } from "../docs/DocsEditor";
import { ProgressBar } from "../ui/kit";
import { AiPanel } from "../ui/AiPanel";
import { CommandPalette, type Command } from "../ui/CommandPalette";
import { ShellFrame, Sidebar, Topbar, type NavItem } from "../ui/chrome";
import { Modal, Toasts } from "../ui/overlay";
import { ErrorState } from "../ui/kit";
import { DocsScreen, FilesScreen, HomeScreen, LaterScreen, SearchResults, SettingsScreen, TemplateLibrary } from "../views/screens";
import { useWorkspace, type ViewId } from "./workspace";

const NAV: Array<NavItem & { id: ViewId }> = [
  { id: "home", label: "", icon: "home", tool: "files" },
  { id: "docs", label: "", icon: "docs", tool: "docs" },
  { id: "sheets", label: "", icon: "sheets", tool: "sheets" },
  { id: "slides", label: "", icon: "slides", tool: "slides" },
  { id: "pdf", label: "", icon: "pdf", tool: "pdf" },
  { id: "files", label: "", icon: "files", tool: "files" },
  { id: "ai", label: "", icon: "ai", tool: "ai" },
  { id: "templates", label: "", icon: "templates", tool: "docs" },
  { id: "settings", label: "", icon: "settings", tool: "files" },
];

export function App() {
  const workspace = useWorkspace();
  const items = NAV.map((item) => ({
    ...item,
    label: workspace.t(
      item.id === "home"
        ? "navHome"
        : item.id === "docs"
          ? "navDocs"
          : item.id === "sheets"
            ? "navSheets"
            : item.id === "slides"
              ? "navSlides"
              : item.id === "pdf"
                ? "navPdf"
                : item.id === "files"
                  ? "navFiles"
                  : item.id === "ai"
                    ? "navAi"
                    : item.id === "templates"
                      ? "navTemplates"
                      : "navSettings",
    ),
  }));

  const exportItems = useMemo(() => {
    if (workspace.session) {
      const kinds: Array<{ id: ExportKind; label: string }> = [
        { id: "pdf", label: workspace.t("exportPdf") },
        { id: "html", label: workspace.t("exportHtml") },
        { id: "txt", label: workspace.t("exportTxt") },
        { id: "orvdoc", label: workspace.t("exportOrvdoc") },
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
  else if (workspace.view === "sheets" || workspace.view === "slides" || workspace.view === "pdf") content = <LaterScreen view={workspace.view} />;
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
      skip={workspace.t("skip")}
      sidebar={
        <Sidebar
          brand={workspace.t("appName")}
          brandAlt={workspace.t("brandAlt")}
          items={items}
          current={workspace.view}
          open={workspace.navOpen}
          onNavigate={(id) => {
            if (id === "ai") {
              workspace.setAiOpen(true);
              void workspace.navigate("ai");
              return;
            }
            void workspace.navigate(id as ViewId);
          }}
          onClose={() => workspace.setNavOpen(false)}
          closeLabel={workspace.t("closeMenu")}
          navLabel={workspace.t("navLabel")}
        />
      }
      topbar={
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
        />
      }
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
      <Modal open={workspace.busy !== null} title={workspace.t("appName")} onClose={() => undefined}>
        <ProgressBar label={workspace.busy ?? workspace.t("preparing")} />
      </Modal>
    </ShellFrame>
  );
}
