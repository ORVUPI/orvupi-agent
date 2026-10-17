import { useEffect, useMemo, useRef, useState } from "react";
import { filterCommands } from "../docs/find";

export type Command = { id: string; label: string; keywords?: string; run: () => void };

export function CommandPalette({
  open,
  title,
  placeholder,
  empty,
  commands,
  onClose,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  empty: string;
  commands: Command[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => filterCommands(commands, query), [commands, query]);
  useEffect(() => {
    if (!open) return;
    setQuery("");
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ow-modal-back" onMouseDown={onClose}>
      <div className="ow-palette" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <input
          ref={input}
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {matches.length === 0 ? <p>{empty}</p> : null}
        <ul role="listbox" aria-label={title}>
          {matches.map((command) => (
            <li key={command.id}>
              <button
                type="button"
                onClick={() => {
                  command.run();
                  onClose();
                }}
              >
                {command.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
