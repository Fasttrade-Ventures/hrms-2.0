import { z } from "zod";

const envSchema = z.object({
  DEPLOYMENT_MODE: z.enum(["standalone", "saas"]).default("standalone"),
  DEFAULT_ORGANIZATION_ID: z.string().uuid().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  PRODUCT_TIER: z.enum(["core", "professional", "enterprise", "pro", "ent"]).optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): ValidatedEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (parsed.data.DEPLOYMENT_MODE === "standalone" && !parsed.data.DEFAULT_ORGANIZATION_ID) {
    throw new Error("DEFAULT_ORGANIZATION_ID is required when DEPLOYMENT_MODE=standalone");
  }
  return parsed.data;
}
