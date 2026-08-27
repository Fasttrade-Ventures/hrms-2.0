import { isSaasMode, type ProductTier } from "@hrms/platform";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { BillingInterval } from "@/lib/billing/plans";
import { createSubscriptionOnRegister } from "@/lib/billing/subscriptions";
import { provisionTenant } from "@/lib/platform/provision-tenant";
import { checkRateLimitDurable } from "@/lib/rate-limit";

function parsePlanTier(value: unknown): ProductTier {
  const tier = String(value ?? "professional");
  if (tier === "core" || tier === "professional" || tier === "enterprise") return tier;
  return "professional";
}

function parseBillingInterval(value: unknown): BillingInterval {
  return String(value ?? "month") === "year" ? "year" : "month";
}

export async function POST(request: Request) {
  if (!isSaasMode()) {
    return NextResponse.json({ error: "Registration is disabled in standalone mode." }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await checkRateLimitDurable(`register:${ip}`, 5, 60_000, 3_000);
  if (!limited.allowed) {
    return NextResponse.json(
      {
        error: `Too many registration attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const body = (await request.json()) as {
    company?: string;
    fullName?: string;
    email?: string;
    password?: string;
    planTier?: string;
    billingInterval?: string;
  };

  const planTier = parsePlanTier(body.planTier);
  const billingInterval = parseBillingInterval(body.billingInterval);
  const email = (body.email ?? "").trim().toLowerCase();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const result = await provisionTenant(admin, {
      company: body.company ?? "",
      fullName: body.fullName ?? "",
      email,
      password: body.password ?? "",
      productTier: planTier,
    });

    await createSubscriptionOnRegister({
      organizationId: result.organizationId,
      ownerEmail: email,
      planTier,
      billingInterval,
    });

    return NextResponse.json({ ...result, planTier, billingInterval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    const status = message.includes("required") || message.includes("Password") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
