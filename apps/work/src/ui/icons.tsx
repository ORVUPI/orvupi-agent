type IconName =
  | "home"
  | "docs"
  | "sheets"
  | "slides"
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
  | "redo";

const paths: Record<IconName, string> = {
  home: "M4 11.5 12 4l8 7.5V20H4Z",
  docs: "M7 3.5h7l4 4V20.5H7Z M14 3.5V8h4",
  sheets: "M5 4.5h14v15H5Z M5 9.5h14 M5 14.5h14 M10 4.5v15",
  slides: "M4 6.5h16v11H4Z M9 20.5h6",
  pdf: "M7 3.5h7l4 4V20.5H7Z M9 13.5h6 M9 16.5h4",
  files: "M4 7.5h6l2 2h8v10H4Z",
  ai: "M12 3.5 14.2 9H20l-4.6 3.4L17.2 18 12 14.8 6.8 18l1.8-5.6L4 9h5.8Z",
  templates: "M6 4.5h12v15H6Z M9 8.5h6 M9 12h6 M9 15.5h3",
  settings: "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z M12 3.5v2 M12 18.5v2 M4.8 7.2l1.7 1 M17.5 15.8l1.7 1 M4.8 16.8l1.7-1 M17.5 8.2l1.7-1",
  search: "M10.5 5.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z M15 15.2 19 19",
  plus: "M12 5v14 M5 12h14",
  close: "M6 6l12 12 M18 6 6 18",
  bold: "M8 5.5h5.2a3.2 3.2 0 0 1 0 6.4H8Z M8 11.9h6a3.3 3.3 0 0 1 0 6.6H8Z",
  italic: "M14 5.5h-6 M16 18.5H10 M13.2 5.5 10.8 18.5",
  underline: "M7 5.5v6.2a5 5 0 0 0 10 0V5.5 M6 18.5h12",
  strike: "M5 12h14 M8 8.2c.6-1.6 2-2.7 4-2.7 2.4 0 4 1.4 4 3.2 M8 16.2c.7 1.4 2.1 2.3 4 2.3 2.5 0 4-1.5 4-3.3",
  list: "M9 7h10 M9 12h10 M9 17h10 M5 7h.01 M5 12h.01 M5 17h.01",
  ordered: "M9 7h10 M9 12h10 M9 17h10 M4.2 8.2V5.6l-1 .6 M4 11.2h2.2L4 13.6h2.4 M4.2 16.2c.4-.6 1.2-.8 1.8-.4.5.4.6 1 .2 1.5L4.2 18.4h2.4",
  alignLeft: "M4 6.5h16 M4 12h10 M4 17.5h14",
  alignCenter: "M4 6.5h16 M7 12h10 M5 17.5h14",
  alignRight: "M4 6.5h16 M10 12h10 M6 17.5h14",
  undo: "M8 8.5H5.5V6 M6 8.5a7 7 0 1 1-1.2 4",
  redo: "M16 8.5h2.5V6 M18 8.5a7 7 0 1 0 1.2 4",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export type { IconName };
