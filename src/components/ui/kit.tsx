import { useState, type ReactNode } from "react";

export function Button({
  children,
  variant = "default",
  pressed,
  type = "button",
  className = "",
  title,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  pressed?: boolean;
}) {
  const tone =
    variant === "primary" ? "ui-btn-primary" : variant === "ghost" ? "ui-btn-ghost" : variant === "danger" ? "ui-btn-danger" : "";
  return (
    <button type={type} title={title} aria-pressed={pressed} className={`ui-btn ${tone} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ui-field">
      <span className="ui-field-label">
        {label}
        <button
          type="button"
          className="ui-help-btn"
          aria-expanded={open}
          aria-label={`Help: ${label}`}
          title={help}
          onClick={() => setOpen((current) => !current)}
        >
          ?
        </button>
      </span>
      {children}
      {open ? <span className="ui-hint">{help}</span> : null}
    </div>
  );
}

export function HelpPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="ui-help-pane">
      <summary>{title}</summary>
      <div className="ui-hint">{children}</div>
    </details>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {title ? <h2 className="ui-panel-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: "custom" | "builtin" | "warn"; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ui-empty">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="ui-dialog-back" onMouseDown={onClose}>
      <div className="ui-dialog" role="dialog" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
