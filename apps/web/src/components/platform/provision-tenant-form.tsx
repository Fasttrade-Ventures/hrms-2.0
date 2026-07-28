"use client";

import { useActionState } from "react";

import {
  provisionTenantAction,
  type PlatformActionState,
} from "@/app/(platform)/platform/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PlatformActionState = {};

export function ProvisionTenantForm() {
  const [state, action, pending] = useActionState(provisionTenantAction, initialState);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Provision tenant</CardTitle>
        <CardDescription>
          Create a new organization, head office branch, and owner account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Company name</Label>
            <Input id="company" name="company" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productTier">Product tier</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="core"
              id="productTier"
              name="productTier"
            >
              <option value="core">Core</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Owner full name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Owner email</Label>
            <Input id="email" name="email" required type="email" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" minLength={8} name="password" required type="password" />
          </div>
          {state.error ? <p className="text-sm text-destructive md:col-span-2">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600 md:col-span-2">{state.success}</p> : null}
          <div className="md:col-span-2">
            <Button disabled={pending} type="submit">
              {pending ? "Provisioning…" : "Provision tenant"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
