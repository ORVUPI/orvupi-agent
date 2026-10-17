import type { CapabilitySnapshot } from "../ai/capabilities";
import { Button } from "./kit";

export function AiPanel({
  open,
  title,
  body,
  closeLabel,
  onClose,
  contextLabel,
  actions,
  unavailable,
  onAction,
  capabilities,
  labels,
}: {
  open: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
  contextLabel: string;
  actions: string[];
  unavailable: string;
  onAction: () => void;
  capabilities: CapabilitySnapshot;
  labels: {
    webgpu: string;
    memory: string;
    browser: string;
    yes: string;
    no: string;
    unknown: string;
    tier: string;
  };
}) {
  if (!open) return null;
  return (
    <aside className="ow-ai" data-tool="ai" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button type="button" className="ow-button ow-button-ghost" onClick={onClose}>
          {closeLabel}
        </button>
      </header>
      <p>{body}</p>
      <p className="ow-kicker">{contextLabel}</p>
      <ul className="ow-ai-actions">
        {actions.map((action) => (
          <li key={action}>
            <Button onClick={onAction}>{action}</Button>
          </li>
        ))}
      </ul>
      <p role="status">{unavailable}</p>
      <dl className="ow-caps">
        <div>
          <dt>{labels.browser}</dt>
          <dd>{capabilities.browser}</dd>
        </div>
        <div>
          <dt>{labels.webgpu}</dt>
          <dd>{capabilities.webgpu ? labels.yes : labels.no}</dd>
        </div>
        <div>
          <dt>{labels.memory}</dt>
          <dd>{capabilities.deviceMemory === null ? labels.unknown : String(capabilities.deviceMemory)}</dd>
        </div>
      </dl>
      <p>{labels.tier}</p>
    </aside>
  );
}
