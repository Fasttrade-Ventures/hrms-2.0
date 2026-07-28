"use client";

import { useActionState, useState } from "react";

import {
  updateRetentionSettingsAction,
  updateSiemSettingsAction,
  type AuditSettingsActionState,
} from "@/app/(hr)/hr/audit/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditSettings } from "@/lib/audit/settings";

const initialState: AuditSettingsActionState = {};

export function AuditSettingsForms({
  settings,
  integrationsEnabled,
}: {
  settings: AuditSettings;
  integrationsEnabled: boolean;
}) {
  const [retentionState, retentionAction, retentionPending] = useActionState(
    updateRetentionSettingsAction,
    initialState,
  );
  const [siemState, siemAction, siemPending] = useActionState(updateSiemSettingsAction, initialState);
  const [archiveEnabled, setArchiveEnabled] = useState(settings.archiveEnabled);
  const [siemEnabled, setSiemEnabled] = useState(settings.siem.enabled);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Retention & archive</CardTitle>
          <CardDescription>
            Hot audit events are kept for the retention window. Older events move to cold storage when
            archiving is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={retentionAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retentionDays">Retention (days)</Label>
              <Input
                defaultValue={settings.retentionDays}
                id="retentionDays"
                min={365}
                name="retentionDays"
                required
                type="number"
              />
            </div>
            <input name="archiveEnabled" type="hidden" value={String(archiveEnabled)} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={archiveEnabled}
                onCheckedChange={(checked) => setArchiveEnabled(checked === true)}
              />
              <span>Enable weekly archive to cold storage</span>
            </label>
            {retentionState.error ? <p className="text-sm text-destructive">{retentionState.error}</p> : null}
            {retentionState.success ? (
              <p className="text-sm text-emerald-600">{retentionState.success}</p>
            ) : null}
            <Button disabled={retentionPending} type="submit">
              {retentionPending ? "Saving…" : "Save retention"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>SIEM webhook</CardTitle>
          <CardDescription>
            Forward audit events to your security stack with HMAC signing. Requires the integrations
            module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!integrationsEnabled ? (
            <p className="text-sm text-muted-foreground">
              Enable the integrations module on the Enterprise plan to configure SIEM forwarding.
            </p>
          ) : (
            <form action={siemAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  defaultValue={settings.siem.url}
                  id="url"
                  name="url"
                  placeholder="https://siem.example.com/hooks/hrms"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret">Signing secret</Label>
                <Input
                  defaultValue={settings.siem.secret}
                  id="secret"
                  name="secret"
                  placeholder="Leave blank to keep existing secret"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventsFilter">Event filter</Label>
                <Input
                  defaultValue={settings.siem.eventsFilter}
                  id="eventsFilter"
                  name="eventsFilter"
                  placeholder="approval.*, document.*, payroll.*"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated action patterns. Use trailing * for prefixes. Empty means all events.
                </p>
              </div>
              <input name="enabled" type="hidden" value={String(siemEnabled)} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={siemEnabled}
                  onCheckedChange={(checked) => setSiemEnabled(checked === true)}
                />
                <span>Enable SIEM delivery</span>
              </label>
              {siemState.error ? <p className="text-sm text-destructive">{siemState.error}</p> : null}
              {siemState.success ? <p className="text-sm text-emerald-600">{siemState.success}</p> : null}
              <Button disabled={siemPending} type="submit">
                {siemPending ? "Saving…" : "Save SIEM settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
