"use client";

import { useState } from "react";

import { HrTextInput } from "@/components/hr/employees/form-fields";

function hiddenValue(value: string): string {
  if (value.length <= 3) return "•".repeat(value.length);
  return `${"•".repeat(value.length - 3)}${value.slice(-3)}`;
}

export function MaskedSecret({ value }: { value: string | null | undefined }) {
  const [shown, setShown] = useState(false);
  if (!value) return <>—</>;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{shown ? value : hiddenValue(value)}</span>
      <button
        aria-pressed={shown}
        className="text-xs font-medium text-[var(--accent-primary)]"
        onClick={() => setShown((current) => !current)}
        type="button"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </span>
  );
}

export function MaskedTaxNumberField({
  defaultValue = "",
  id,
  name,
}: {
  defaultValue?: string;
  id: string;
  name: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <HrTextInput
        autoComplete="off"
        className="pr-16"
        defaultValue={defaultValue}
        id={id}
        inputMode="numeric"
        name={name}
        required
        spellCheck={false}
        type={shown ? "text" : "password"}
      />
      <button
        aria-controls={id}
        aria-pressed={shown}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-[var(--accent-primary)]"
        onClick={() => setShown((current) => !current)}
        type="button"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
