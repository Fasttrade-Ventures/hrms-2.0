"use client";

import { useActionState } from "react";

import {
  respondToOfferAction,
  type OfferRespondState,
} from "@/app/offer/respond/[token]/actions";
import { Button } from "@/components/ui/button";
import { OfferPublicMessage } from "@/components/offer/offer-public-shell";

const initialState: OfferRespondState = { status: "idle" };

export function OfferRespondClient({
  token,
  preselect,
}: {
  token: string;
  preselect: "accept" | "reject" | null;
}) {
  const [state, action, pending] = useActionState(respondToOfferAction, initialState);

  if (state.status === "accepted") {
    return (
      <OfferPublicMessage
        description={
          state.agreementEmailed
            ? "Congratulations! We've emailed your employment agreement with a link to upload the signed copy."
            : "Congratulations! The hiring team will send your employment agreement shortly."
        }
        title="Offer accepted"
      />
    );
  }

  if (state.status === "declined") {
    return (
      <OfferPublicMessage
        description="We've recorded that you declined this offer. Thank you for your time."
        title="Offer declined"
      />
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input name="token" type="hidden" value={token} />
      {preselect ? (
        <p className="text-sm text-muted-foreground">
          You opened the {preselect === "accept" ? "accept" : "decline"} link. Please confirm your choice below.
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="accept"
          variant={preselect === "reject" ? "outline" : "default"}
        >
          Accept offer
        </Button>
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="reject"
          variant={preselect === "reject" ? "default" : "outline"}
        >
          Decline offer
        </Button>
      </div>
    </form>
  );
}
