import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  Folder,
  HardDrive,
  Home,
  Info,
  Italic,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListOrdered,
  PenLine,
  Plus,
  Presentation,
  StickyNote,
  Redo2,
  Search,
  Settings,
  Sparkles,
  Star,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "home"
  | "docs"
  | "sheets"
  | "slides"
  | "forms"
  | "drawings"
  | "notes"
  | "pdf"
  | "files"
  | "ai"
  | "templates"
  | "settings"
  | "search"
  | "plus"
  | "close"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "list"
  | "ordered"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "undo"
  | "redo"
  | "clock"
  | "star"
  | "trash"
  | "database"
  | "grid"
  | "info"
  | "drive";

const icons: Record<IconName, LucideIcon> = {
  home: Home,
  docs: FileText,
  sheets: Table,
  slides: Presentation,
  forms: ClipboardList,
  drawings: PenLine,
  notes: StickyNote,
  pdf: FileText,
  files: Folder,
  ai: Sparkles,
  templates: LayoutTemplate,
  settings: Settings,
  search: Search,
  plus: Plus,
  close: X,
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strike: Strikethrough,
  list: List,
  ordered: ListOrdered,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,
  undo: Undo2,
  redo: Redo2,
  clock: Clock3,
  star: Star,
  trash: Trash2,
  database: Database,
  grid: LayoutGrid,
  info: Info,
  drive: HardDrive,
};

export function Icon({ name }: { name: IconName }) {
  const Glyph = icons[name];
  return <Glyph className="ow-icon" aria-hidden size={20} strokeWidth={1.8} />;
}
