import { NextResponse } from "next/server";

import { markInvoicePaidFromStripe } from "@/lib/billing/subscriptions";
import { constructStripeEvent } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;
    if (session.payment_status === "paid" && invoiceId) {
      try {
        const paid = await markInvoicePaidFromStripe({
          invoiceId,
          stripeSessionId: session.id,
          amountTotal: session.amount_total,
        });
        if (!paid) {
          console.error("Stripe checkout did not match an open invoice", session.id);
        }
      } catch (error) {
        console.error("Stripe webhook processing error", error);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
