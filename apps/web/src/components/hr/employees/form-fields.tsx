import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function HrField({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-[var(--foreground-primary)]" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-[var(--foreground-muted)]">{hint}</p> : null}
    </div>
  );
}

const fieldClassName =
  "h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 text-[15px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)]";

export function HrTextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldClassName} {...props} />;
}

export function HrSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldClassName} {...props} />;
}

export function HrTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-[88px] w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-[15px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)]"
      {...props}
    />
  );
}

export function HrCheckbox({
  id,
  label,
  defaultChecked,
  name,
  value,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
  name?: string;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-[var(--foreground-secondary)]" htmlFor={id}>
      <input
        className="h-[18px] w-[18px] accent-[var(--accent-primary)]"
        defaultChecked={defaultChecked}
        id={id}
        name={name}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}

export function HrPrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function HrGhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function HrFormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={`border px-4 py-3 text-sm ${
        error
          ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
          : "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
      }`}
    >
      {error ?? success}
    </div>
  );
}
