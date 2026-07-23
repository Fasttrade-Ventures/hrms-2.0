export type ServiceHealth = {
  ok: boolean;
  message?: string;
  detail?: Record<string, unknown>;
};

export type HealthReport = {
  ok: boolean;
  timestamp: string;
  deployment: {
    mode: string | null;
    productTier: string | null;
  };
  env: Record<string, boolean>;
  services: {
    supabase: ServiceHealth;
    r2: ServiceHealth;
    resend: ServiceHealth;
  };
};

function envPresent(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function runHealthChecks(): Promise<HealthReport> {
  const env = {
    DEPLOYMENT_MODE: envPresent("DEPLOYMENT_MODE"),
    DEFAULT_ORGANIZATION_ID: envPresent("DEFAULT_ORGANIZATION_ID"),
    NEXT_PUBLIC_SUPABASE_URL: envPresent("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: envPresent("SUPABASE_SERVICE_ROLE_KEY"),
    R2_ACCOUNT_ID: envPresent("R2_ACCOUNT_ID"),
    R2_ACCESS_KEY_ID: envPresent("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: envPresent("R2_SECRET_ACCESS_KEY"),
    R2_BUCKET: envPresent("R2_BUCKET"),
    RESEND_API_KEY: envPresent("RESEND_API_KEY"),
    MAIL_FROM: envPresent("MAIL_FROM"),
    PRODUCT_TIER: envPresent("PRODUCT_TIER"),
  };

  const [supabase, r2, resend] = await Promise.all([
    checkSupabase(),
    checkR2(),
    checkResend(),
  ]);

  const ok =
    Object.values(env).every(Boolean) && supabase.ok && r2.ok && resend.ok;

  return {
    ok,
    timestamp: new Date().toISOString(),
    deployment: {
      mode: process.env.DEPLOYMENT_MODE ?? null,
      productTier: process.env.PRODUCT_TIER ?? null,
    },
    env,
    services: { supabase, r2, resend },
  };
}

async function checkSupabase(): Promise<ServiceHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return { ok: false, message: "Missing Supabase URL or service role key" };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count, error } = await client
      .from("organizations")
      .select("id", { count: "exact", head: true });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      detail: { organizationCount: count ?? 0 },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Supabase check failed",
    };
  }
}

async function checkR2(): Promise<ServiceHealth> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return { ok: false, message: "Missing R2 environment variables" };
  }

  try {
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(new HeadBucketCommand({ Bucket: bucket }));

    return { ok: true, detail: { bucket } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "R2 check failed",
    };
  }
}

async function checkResend(): Promise<ServiceHealth> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: false, message: "Missing RESEND_API_KEY" };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, message: `Resend API ${response.status}: ${body.slice(0, 120)}` };
    }

    const data = (await response.json()) as { data?: Array<{ name: string; status: string }> };
    const domains = (data.data ?? []).map((d) => ({ name: d.name, status: d.status }));

    return {
      ok: domains.some((d) => d.status === "verified"),
      message: domains.some((d) => d.status === "verified")
        ? undefined
        : "No verified sending domain in Resend",
      detail: { domains },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Resend check failed",
    };
  }
}
