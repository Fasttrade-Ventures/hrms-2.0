"use client";

import { useActionState, useRef, useState } from "react";

import { ConfirmDialog, StatusPill } from "@hrms/ui";

import {
  generateHirixCoreKeyAction,
  revokeHirixCoreKeyAction,
  type HirixCoreActionState,
} from "@/app/(hr)/hr/integrations/hirix-core/actions";
import { HrFormMessage } from "@/components/hr/employees/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: HirixCoreActionState = {};

export type HirixCorePanelStatus = {
  active: boolean;
  keyPrefix: string | null;
  createdLabel: string | null;
  lastUsedLabel: string | null;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the value is still selectable below.
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2.5 font-mono text-xs break-all select-all">
          {value}
        </code>
        <Button className="w-full sm:w-auto" onClick={copy} type="button" variant="outline">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function HirixCorePanel({
  status,
  baseUrl,
}: {
  status: HirixCorePanelStatus;
  baseUrl: string;
}) {
  const [generateState, generateAction, generating] = useActionState(
    generateHirixCoreKeyAction,
    initialState,
  );
  const [revokeState, revokeAction, revoking] = useActionState(
    revokeHirixCoreKeyAction,
    initialState,
  );
  const generateForm = useRef<HTMLFormElement>(null);
  const revokeForm = useRef<HTMLFormElement>(null);
  const [confirm, setConfirm] = useState<"rotate" | "revoke" | null>(null);

  const message = generateState.error ?? revokeState.error;
  const success = generateState.secret ? undefined : (generateState.success ?? revokeState.success);

  return (
    <div className="space-y-6">
      {generateState.secret && status.active ? (
        <Card className="border-primary/30" size="sm">
          <CardHeader>
            <CardTitle>Copy these now</CardTitle>
            <CardDescription>
              BukuHR shows the key only once. In Hirix Core, open Integrations, choose BukuHR and paste both values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyField label="API URL" value={baseUrl} />
            <CopyField label="API key" value={generateState.secret} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Hirix Core key</CardTitle>
            <CardDescription>
              Lets Hirix Core add a newly onboarded hire to BukuHR. It can only create employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3 text-sm">
              <Row label="Status">
                <StatusPill
                  label={status.active ? "Key active" : "Not set up"}
                  tone={status.active ? "success" : "neutral"}
                />
              </Row>
              {status.active ? (
                <>
                  <Row label="Key">
                    <span className="font-mono text-xs">{status.keyPrefix}…</span>
                  </Row>
                  <Row label="Created">{status.createdLabel}</Row>
                  <Row label="Last used">{status.lastUsedLabel ?? "Not used yet"}</Row>
                </>
              ) : null}
            </dl>

            <HrFormMessage error={message} success={success} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={generateAction} className="sm:w-auto" ref={generateForm}>
                <Button
                  className="w-full sm:w-auto"
                  disabled={generating || revoking}
                  onClick={() => {
                    if (status.active) setConfirm("rotate");
                    else generateForm.current?.requestSubmit();
                  }}
                  type="button"
                >
                  {generating ? "Creating…" : status.active ? "Rotate key" : "Generate key"}
                </Button>
              </form>
              {status.active ? (
                <form action={revokeAction} ref={revokeForm}>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={generating || revoking}
                    onClick={() => setConfirm("revoke")}
                    type="button"
                    variant="outline"
                  >
                    {revoking ? "Revoking…" : "Revoke"}
                  </Button>
                </form>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>How to connect</CardTitle>
            <CardDescription>One key per organization. Hirix Core never sees payroll or leave.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Generate the key here and copy the URL and key.</li>
              <li>
                In Hirix Core, open Integrations, choose <span className="text-foreground">Connect</span> on BukuHR,
                and paste both values.
              </li>
              <li>
                On a hire whose tax details are received, choose <span className="text-foreground">Add to BukuHR</span>.
                The employee then appears under Employees.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Rotating a key stops the old one at once. Use Update key in Hirix Core straight after.
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        cancelLabel="Keep current key"
        confirmLabel="Rotate key"
        message="The current key stops working immediately. Hirix Core cannot add employees until you paste the new key in Hirix Core."
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          generateForm.current?.requestSubmit();
        }}
        open={confirm === "rotate"}
        title="Rotate the Hirix Core key?"
        tone="danger"
      />
      <ConfirmDialog
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        message="Hirix Core will no longer be able to add employees to BukuHR until you generate a new key."
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          revokeForm.current?.requestSubmit();
        }}
        open={confirm === "revoke"}
        title="Revoke the Hirix Core key?"
        tone="danger"
      />
    </div>
  );
}
