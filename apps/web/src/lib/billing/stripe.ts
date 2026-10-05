import Stripe from "stripe";

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe is not configured.");
  }
  return new Stripe(key);
}

export async function createStripeCheckoutSession(input: {
  invoiceId: string;
  amountSen: number;
  planName: string;
  customerEmail: string;
}): Promise<{ id: string; url: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    client_reference_id: input.invoiceId,
    success_url: `${siteUrl}/owner/billing?paid=1`,
    cancel_url: `${siteUrl}/owner/billing`,
    metadata: { invoiceId: input.invoiceId },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "myr",
          unit_amount: input.amountSen,
          product_data: {
            name: `BukuHR ${input.planName}`,
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { id: session.id, url: session.url };
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Stripe webhook secret is not configured.");
  }
  return stripeClient().webhooks.constructEvent(rawBody, signature, secret);
}
