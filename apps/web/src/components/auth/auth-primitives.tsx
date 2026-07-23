import type { ButtonHTMLAttributes, ReactNode } from "react";

export function AuthBrand({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center ${
          inverted ? "bg-white text-[var(--surface-inverse)]" : "bg-[var(--accent-primary)] text-white"
        }`}
      >
        <span className="text-lg font-bold leading-none">H</span>
      </div>
      <span
        className={`text-xl font-bold ${
          inverted ? "text-[var(--foreground-inverse)]" : "text-[var(--foreground-primary)]"
        }`}
      >
        HRMS
      </span>
    </div>
  );
}

export function AuthCardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-[var(--foreground-primary)] max-lg:text-[28px]">
        {title}
      </h1>
      <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)] max-lg:text-sm">
        {subtitle}
      </p>
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-12 w-full items-center justify-center bg-[var(--accent-primary)] px-5 text-[15px] font-semibold text-[var(--foreground-inverse)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthGhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-12 w-full items-center justify-center border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-[15px] font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthTextField({
  id,
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  defaultValue,
  readOnly,
  muted,
}: {
  id: string;
  label: string;
  name?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-[var(--foreground-primary)]" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className={`h-12 w-full border border-[var(--border-primary)] px-3.5 text-[15px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-focus)] ${
          muted ? "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]" : "bg-[var(--surface-card)]"
        }`}
        defaultValue={defaultValue}
        id={id}
        name={name}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        type={type}
      />
    </div>
  );
}

export function AuthCheckbox({
  defaultChecked,
  id,
  label,
  name,
}: {
  defaultChecked?: boolean;
  id: string;
  label: string;
  name?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-[13px] text-[var(--foreground-secondary)]" htmlFor={id}>
      <input
        className="h-[18px] w-[18px] border border-[var(--border-primary)] bg-[var(--surface-card)] accent-[var(--accent-primary)]"
        defaultChecked={defaultChecked}
        id={id}
        name={name}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export function AuthCardFooter({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-[13px] leading-relaxed text-[var(--foreground-muted)]">{children}</div>;
}
