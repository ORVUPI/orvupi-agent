import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`ow-button ow-button-${variant} ${className}`.trim()} {...props} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  pressed?: boolean;
};

export function IconButton({ label, pressed, className = "", type = "button", children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`ow-icon-button ow-tip ${className}`.trim()}
      aria-label={label}
      aria-pressed={pressed}
      data-tooltip={label}
      {...props}
    >
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Input({ label, hint, id, ...props }: FieldProps) {
  const fieldId = id ?? props.name ?? label;
  return (
    <label className="ow-field" htmlFor={fieldId}>
      <span>{label}</span>
      <input id={fieldId} {...props} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode };

export function Select({ label, id, children, ...props }: SelectProps) {
  const fieldId = id ?? props.name ?? label;
  return (
    <label className="ow-field" htmlFor={fieldId}>
      <span>{label}</span>
      <select id={fieldId} {...props}>
        {children}
      </select>
    </label>
  );
}

export function SearchField({
  label,
  value,
  placeholder,
  clearLabel,
  onValue,
}: {
  label: string;
  value: string;
  placeholder: string;
  clearLabel: string;
  onValue: (value: string) => void;
}) {
  return (
    <search className="ow-search">
      <label className="ow-sr" htmlFor="ow-search">
        {label}
      </label>
      <input
        id="ow-search"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValue(event.target.value)}
      />
      {value ? (
        <button type="button" className="ow-search-clear" onClick={() => onValue("")}>
          {clearLabel}
        </button>
      ) : null}
    </search>
  );
}

export function ProgressBar({ label }: { label: string }) {
  return (
    <div className="ow-progress" role="progressbar" aria-valuetext={label} aria-label={label}>
      <span>{label}</span>
      <i />
    </div>
  );
}

export function Card({
  title,
  body,
  action,
  tool,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  tool?: string;
}) {
  return (
    <article className="ow-card" data-tool={tool}>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </article>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="ow-empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  reason,
  solution,
  onRetry,
  retryLabel,
  extra,
}: {
  title: string;
  reason: string;
  solution: string;
  onRetry?: () => void;
  retryLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="ow-error" role="alert">
      <h2>{title}</h2>
      <p>{reason}</p>
      <p>{solution}</p>
      <div className="ow-row">
        {onRetry && retryLabel ? (
          <Button variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {extra}
      </div>
    </div>
  );
}

export function Tabs({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ow-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="ow-panel">
      {children}
    </div>
  );
}
