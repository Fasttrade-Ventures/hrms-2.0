"use client";

import { useActionState } from "react";

import { revokeApiKeyAction, createApiKeyAction } from "@/app/(hr)/hr/integrations/api/actions";
import { HrFormMessage, HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";

const SCOPE_OPTIONS = [
  { id: "employees:read", label: "Read employees" },
  { id: "leave:read", label: "Read leave" },
  { id: "payroll:read", label: "Read payroll" },
  { id: "attendance:clock", label: "Clock attendance" },
  { id: "staff:self", label: "Staff self-service" },
] as const;

export function ApiKeysPanel({
  keys,
  baseUrl,
}: {
  baseUrl: string;
  keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[] | null;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
  }>;
}) {
  const [state, action, pending] = useActionState(createApiKeyAction, {});
  const clockInExample = `curl -X POST ${baseUrl}/attendance/clock-in \\
  -H "Authorization: Bearer hrms_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"employeeNumber":"E001"}'`;

  return (
    <div className="space-y-8">
      <section className="space-y-6 rounded-xl border p-5 text-sm">
        <div className="space-y-2">
          <h2 className="text-base font-medium">Integration manual</h2>
          <p className="text-muted-foreground">
            Use this when a virtual office, or any other system, needs to clock staff in BukuHR. The other system keeps its own login. BukuHR only receives the clock call.
          </p>
        </div>

        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Create a key below and leave Clock attendance checked.</li>
          <li>Copy the secret immediately. BukuHR shows it once.</li>
          <li>Store the secret on the other system. Do not put it in a public web page.</li>
          <li>When a staff member logs into that system, call clock-in. When they leave, call clock-out.</li>
        </ol>

        <div className="space-y-1">
          <p className="font-medium">Base URL</p>
          <p className="font-mono text-xs">{baseUrl}</p>
        </div>

        <div className="space-y-1">
          <p className="font-medium">Authentication</p>
          <p className="text-muted-foreground">
            Send the secret on every request as <span className="font-mono text-foreground">Authorization: Bearer hrms_live_…</span> or{" "}
            <span className="font-mono text-foreground">X-API-Key: hrms_live_…</span>. A missing or revoked key returns 401. A key without Clock attendance returns 403.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-medium">Attendance</p>
          <p className="text-muted-foreground">
            Identify the person with <span className="font-mono text-foreground">employeeNumber</span> or <span className="font-mono text-foreground">email</span>. The person must already be an active employee in this organization. This call does not ask for GPS or a selfie. The record is stored as <span className="font-mono text-foreground">virtual_office</span>.
          </p>
          <div className="space-y-1">
            <p>Clock in — <span className="font-mono text-xs">POST {baseUrl}/attendance/clock-in</span></p>
            <p className="text-muted-foreground">Body: {`{ "employeeNumber": "E001" }`} or {`{ "email": "staff@company.com" }`}. Success is 201. Already clocked in is 409. Unknown staff is 404.</p>
          </div>
          <div className="space-y-1">
            <p>Clock out — <span className="font-mono text-xs">POST {baseUrl}/attendance/clock-out</span></p>
            <p className="text-muted-foreground">Same body. Success is 200. Not clocked in is 409.</p>
          </div>
          <div className="space-y-1">
            <p>Today — <span className="font-mono text-xs">GET {baseUrl}/attendance</span></p>
            <p className="text-muted-foreground">Optional <span className="font-mono text-foreground">?date=2026-10-10</span>. Returns each session with clock-in, clock-out, status, and source.</p>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{clockInExample}</pre>
        </div>

        <div className="space-y-2">
          <p className="font-medium">Staff self-service</p>
          <p className="text-muted-foreground">
            One key with Staff self-service checked can also apply and cancel leave, submit a claim, request overtime, ask to fix a missed clock time, and read that person’s leave balance and locked payslips. Clock attendance is included. Identify the person the same way, with employee number or email. The person must already have a login in BukuHR, because the request still goes to their manager for approval.
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li><span className="font-mono text-xs text-foreground">POST {baseUrl}/leave-requests</span> — leaveTypeId, startDate, endDate, optional halfDay and reason</li>
            <li><span className="font-mono text-xs text-foreground">POST {baseUrl}/leave-requests/{"{id}"}/cancel</span> — optional reason</li>
            <li><span className="font-mono text-xs text-foreground">POST {baseUrl}/claims</span> — claimTypeId, receiptDate, amount. Mileage uses distanceKm, origin, and destination</li>
            <li><span className="font-mono text-xs text-foreground">POST {baseUrl}/overtime</span> — workDate, hours, optional rateType (1.5, 2.0, or 3.0) and reason</li>
            <li><span className="font-mono text-xs text-foreground">POST {baseUrl}/attendance/manual</span> — requestDate, optional clockInTime, clockOutTime, and reason</li>
            <li><span className="font-mono text-xs text-foreground">GET {baseUrl}/leave-balances?employeeNumber=E001</span></li>
            <li><span className="font-mono text-xs text-foreground">GET {baseUrl}/payslips?employeeNumber=E001</span> — locked payslips only</li>
          </ul>
        </div>
      </section>

      <form action={action} className="space-y-4 rounded-xl border p-5">
        <div>
          <label className="text-sm font-medium" htmlFor="name">
            Key name
          </label>
          <HrTextInput id="name" name="name" placeholder="Virtual office" required />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What this key can do</legend>
          {SCOPE_OPTIONS.map((scope) => (
            <label className="flex items-center gap-2 text-sm" key={scope.id}>
              <input defaultChecked name={scope.id} type="checkbox" />
              {scope.label}
            </label>
          ))}
        </fieldset>
        <HrFormMessage error={state.error} success={state.success} />
        {state.secret ? (
          <p className="rounded-lg bg-muted p-3 font-mono text-xs break-all">{state.secret}</p>
        ) : null}
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Creating…" : "Create API key"}
        </HrPrimaryButton>
      </form>

      <ul className="space-y-3">
        {keys.map((key) => (
          <li className="flex items-center justify-between rounded-lg border p-3 text-sm" key={key.id}>
            <div>
              <p className="font-medium">{key.name}</p>
              <p className="text-muted-foreground">{key.key_prefix}…</p>
              <p className="text-muted-foreground">{(key.scopes ?? []).join(", ") || "employees, leave, payroll"}</p>
            </div>
            {!key.revoked_at ? (
              <form action={revokeApiKeyAction.bind(null, key.id)}>
                <HrPrimaryButton type="submit">Revoke</HrPrimaryButton>
              </form>
            ) : (
              <span className="text-muted-foreground">Revoked</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
