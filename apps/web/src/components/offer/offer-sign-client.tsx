"use client";

import { useActionState } from "react";

import {
  uploadSignedAgreementAction,
  type OfferSignState,
} from "@/app/offer/sign/[token]/actions";
import { OfferPublicMessage } from "@/components/offer/offer-public-shell";
import { Button } from "@/components/ui/button";

const initialState: OfferSignState = { status: "idle" };

export function OfferSignClient({ token }: { token: string }) {
  const [state, action, pending] = useActionState(uploadSignedAgreementAction, initialState);

  if (state.status === "uploaded") {
    return (
      <OfferPublicMessage
        description="We've received your signed agreement. The hiring team will confirm next steps with you. You can close this page."
        title="Thank you"
      />
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input name="token" type="hidden" value={token} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="signed-file">
          Signed agreement
        </label>
        <input
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="block w-full text-sm"
          id="signed-file"
          name="file"
          required
          type="file"
        />
        <p className="text-xs text-muted-foreground">PDF preferred. Max 10 MB.</p>
      </div>
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Uploading…" : "Upload signed agreement"}
      </Button>
    </form>
  );
}
