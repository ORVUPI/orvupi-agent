import { withBase } from "../routing/paths";
import { useRef, type ReactNode } from "react";
import type { SaveState } from "../docs/save-status";
import { Icon, type IconName } from "./icons";
import { IconButton, SearchField } from "./kit";
import { Dropdown, FilePicker } from "./overlay";

export type NavItem = { id: string; label: string; icon: IconName; tool: string };

export function Sidebar({
  brand,
  brandAlt,
  groups,
  current,
  open,
  onNavigate,
  onClose,
  closeLabel,
  navLabel,
  action,
  footer,
}: {
  brand: string;
  brandAlt: string;
  groups: Array<{ id: string; label: string; items: NavItem[] }>;
  current: string;
  open: boolean;
  onNavigate: (id: string) => void;
  onClose: () => void;
  closeLabel: string;
  navLabel: string;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className={`ow-sidebar ${open ? "is-open" : ""}`} data-tool="files">
      <div className="ow-brand">
        <img src={withBase("/avatar.png")} alt={brandAlt} width={48} height={48} />
        <strong>{brand}</strong>
        <IconButton label={closeLabel} className="ow-only-mobile" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>
      {action}
      <nav aria-label={navLabel}>
        {groups.map((group) => (
          <div key={group.id} className="ow-nav-group">
            <p className="ow-nav-label">{group.label}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-tool={item.tool}
                    aria-current={current === item.id ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {footer}
    </aside>
  );
}

export function Topbar({
  menuLabel,
  onMenu,
  searchLabel,
  searchPlaceholder,
  searchClear,
  query,
  onQuery,
  fileName,
  fileNameLabel,
  onRename,
  onCommitName,
  saveState,
  saveLabel,
  importLabel,
  onImport,
  exportLabel,
  exportItems,
  settingsLabel,
  onSettings,
  aiLabel,
  aiPressed,
  onAi,
  closeDocLabel,
  onCloseDoc,
  chips,
  chipsMoreLabel,
  starred,
  starLabel,
  onStar,
  language,
}: {
  menuLabel: string;
  onMenu: () => void;
  searchLabel: string;
  searchPlaceholder: string;
  searchClear: string;
  query: string;
  onQuery: (value: string) => void;
  fileName: string | null;
  fileNameLabel: string;
  onRename: (value: string) => void;
  onCommitName: () => void;
  saveState: SaveState | null;
  saveLabel: string;
  importLabel: string;
  onImport: (file: File) => void;
  exportLabel: string;
  exportItems: Array<{ id: string; label: string; onSelect: () => void }>;
  settingsLabel: string;
  onSettings: () => void;
  aiLabel: string;
  aiPressed: boolean;
  onAi: () => void;
  /** Selector de idioma siempre visible (escritorio y móvil). Nombres propios, sin banderas. */
  language?: { label: string; value: string; options: ReadonlyArray<{ id: string; name: string }>; onChange: (value: string) => void };
  closeDocLabel: string;
  onCloseDoc: (() => void) | null;
  chips?: ReactNode;
  chipsMoreLabel: string;
  starred?: boolean;
  starLabel?: string;
  onStar?: () => void;
}) {
  const chipsRef = useRef<HTMLDivElement>(null);
  return (
    <header className="ow-topbar">
      <div className="ow-top-actions">
      <button type="button" aria-label={menuLabel} className="ow-brandmark ow-only-mobile" onClick={onMenu}>
        <img src={withBase("/avatar.png")} alt="" width={32} height={32} />
      </button>
      {fileName !== null ? (
        <input
          className="ow-filename"
          aria-label={fileNameLabel}
          value={fileName}
          onChange={(event) => onRename(event.target.value)}
          onBlur={() => onCommitName()}
        />
      ) : null}
      {onStar && starLabel ? (
        <IconButton label={starLabel} pressed={starred} onClick={onStar}>
          <Icon name="star" />
        </IconButton>
      ) : null}
      {fileName === null ? (
        <p className="ow-top-title"><img className="ow-top-logo" src={withBase("/avatar.png")} alt="" width={28} height={28} />ORVUPI Work</p>
      ) : null}
      {saveState ? (
        <span className={`ow-save ow-save-${saveState}`} role="status" data-state={saveState}>
          {saveLabel}
        </span>
      ) : null}
      <FilePicker label={importLabel} accept=".orvdoc,.json,.txt,.md,.html,.htm,.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.docx,.pptx" onFile={onImport} />
      <Dropdown label={exportLabel} items={exportItems} />
      {onCloseDoc ? (
        <button type="button" className="ow-button ow-button-secondary" onClick={onCloseDoc}>
          {closeDocLabel}
        </button>
      ) : null}
      {language ? (
        <label className="ow-lang">
          <span className="ow-visually-hidden">{language.label}</span>
          <select
            aria-label={language.label}
            value={language.value}
            data-testid="ow-lang"
            onChange={(event) => language.onChange(event.target.value)}
          >
            {language.options.map((item) => (
              <option key={item.id} value={item.id} lang={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      <IconButton label={settingsLabel} onClick={onSettings}>
        <Icon name="settings" />
      </IconButton>
      <IconButton label={aiLabel} pressed={aiPressed} onClick={onAi}>
        <Icon name="ai" />
      </IconButton>
      </div>
      <SearchField
        label={searchLabel}
        value={query}
        placeholder={searchPlaceholder}
        clearLabel={searchClear}
        onValue={onQuery}
      />
      {chips ? (
        <div className="ow-chiprow">
          <div className="ow-chips" ref={chipsRef}>{chips}</div>
          <button
            type="button"
            className="ow-chip-more"
            aria-label={chipsMoreLabel}
            onClick={() => chipsRef.current?.scrollBy({ left: 140 })}
          >
            ›
          </button>
        </div>
      ) : null}
    </header>
  );
}

export function ShellFrame({
  sidebar,
  topbar,
  children,
  aside,
  skip,
  className = "",
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
  aside: ReactNode;
  skip: string;
  className?: string;
}) {
  return (
    <div className={`ow-shell ${className}`.trim()}>
      <a className="ow-skip" href="#contenido">
        {skip}
      </a>
      {sidebar}
      <div className="ow-maincol">
        {topbar}
        <main id="contenido">{children}</main>
      </div>
      {aside}
    </div>
  );
}
