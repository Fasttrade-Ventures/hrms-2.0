import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

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
  "h-11 w-full border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 text-[15px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-focus)]";

export function HrTextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldClassName} {...props} />;
}

export function HrSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldClassName} {...props} />;
}

export function HrCheckbox({
  id,
  label,
  defaultChecked,
  name,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
  name?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-[var(--foreground-secondary)]" htmlFor={id}>
      <input
        className="h-[18px] w-[18px] accent-[var(--accent-primary)]"
        defaultChecked={defaultChecked}
        id={id}
        name={name}
        type="checkbox"
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
      className={`inline-flex h-11 items-center justify-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
      className={`inline-flex h-11 items-center justify-center border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
