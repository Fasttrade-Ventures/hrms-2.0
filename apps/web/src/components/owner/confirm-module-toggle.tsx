"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@hrms/ui";

import { Button } from "@/components/ui/button";

export function ConfirmModuleToggle({
  action,
  fields,
  enabled,
  subject,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  enabled: boolean;
  subject: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const verb = enabled ? "Disable" : "Enable";

  return (
    <>
      <form action={action} className="inline-flex" ref={formRef}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} name={name} type="hidden" value={value} />
        ))}
        <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
          {verb}
        </Button>
      </form>
      <ConfirmDialog
        confirmLabel={verb}
        message={
          enabled
            ? `Disable ${subject}? People using it will lose access until you turn it back on.`
            : `Enable ${subject}? This changes what the organization can use.`
        }
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
        open={open}
        title={`${verb} ${subject}`}
        tone={enabled ? "warning" : "primary"}
      />
    </>
  );
}
