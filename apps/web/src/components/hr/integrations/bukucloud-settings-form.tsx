"use client";

import { useActionState, useState } from "react";

import {
  saveBukucloudSettingsAction,
  testBukucloudConnectionAction,
  type BukucloudActionState,
} from "@/app/(hr)/hr/integrations/bukucloud/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BukucloudSettingsView } from "@/lib/integrations/bukucloud/config";

const initialState: BukucloudActionState = {};

export function BukucloudSettingsForm({ settings }: { settings: BukucloudSettingsView }) {
  const [saveState, saveAction, savePending] = useActionState(saveBukucloudSettingsAction, initialState);
  const [testState, testAction, testPending] = useActionState(testBukucloudConnectionAction, initialState);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [autoSyncOnLock, setAutoSyncOnLock] = useState(settings.autoSyncOnLock);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Tenant API credentials</CardTitle>
          <CardDescription>
            Connect to your BukuCloud tenant using the API key from Settings → API &amp; Integrations.
            Write operations require the signing key (HMAC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">BukuCloud base URL</Label>
              <Input
                defaultValue={settings.baseUrl}
                id="baseUrl"
                name="baseUrl"
                placeholder="https://your-tenant.bukucloud.com"
                required
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantLabel">Tenant label (optional)</Label>
              <Input
                defaultValue={settings.tenantLabel}
                id="tenantLabel"
                name="tenantLabel"
                placeholder="Acme Sdn Bhd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API key (pk_live_…)</Label>
              <Input
                defaultValue={settings.apiKey}
                id="apiKey"
                name="apiKey"
                placeholder={settings.configured ? "Leave blank to keep existing" : "pk_live_…"}
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signingKey">Signing key (sk_live_…)</Label>
              <Input
                defaultValue={settings.signingKey}
                id="signingKey"
                name="signingKey"
                placeholder={settings.configured ? "Leave blank to keep existing" : "sk_live_…"}
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountCode">Bank account code</Label>
              <Input
                defaultValue={settings.bankAccountCode}
                id="bankAccountCode"
                name="bankAccountCode"
                placeholder="e.g. 1000"
                required
              />
              <p className="text-xs text-muted-foreground">
                Chart of accounts code for the bank account credited with net pay.
              </p>
            </div>
            <input name="enabled" type="hidden" value={String(enabled)} />
            <input name="autoSyncOnLock" type="hidden" value={String(autoSyncOnLock)} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
              <span>Enable BukuCloud payroll integration</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={autoSyncOnLock}
                onCheckedChange={(checked) => setAutoSyncOnLock(checked === true)}
              />
              <span>Auto-sync when a payrun is locked</span>
            </label>
            {saveState.error ? <p className="text-sm text-destructive">{saveState.error}</p> : null}
            {saveState.success ? <p className="text-sm text-emerald-600">{saveState.success}</p> : null}
            <Button disabled={savePending} type="submit">
              {savePending ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Connection test</CardTitle>
          <CardDescription>
            Verifies the API key against <code className="text-xs">GET /api/v1/customers</code> on your tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={testAction} className="space-y-4">
            <input name="baseUrl" type="hidden" value={settings.baseUrl} />
            <input name="apiKey" type="hidden" value={settings.apiKey} />
            <input name="signingKey" type="hidden" value={settings.signingKey} />
            <input name="bankAccountCode" type="hidden" value={settings.bankAccountCode} />
            <p className="text-sm text-muted-foreground">
              Uses the values from the form on the left. Save first if you changed credentials.
            </p>
            {testState.error ? <p className="text-sm text-destructive">{testState.error}</p> : null}
            {testState.success ? <p className="text-sm text-emerald-600">{testState.success}</p> : null}
            <Button disabled={testPending} type="submit" variant="outline">
              {testPending ? "Testing…" : "Test connection"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
