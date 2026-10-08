import { createBrowserClient } from "@supabase/ssr";

declare global {
  interface Window {
    __ENV?: {
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      NEXT_PUBLIC_SITE_URL?: string;
    };
  }
}

export function createClient() {
  const url =
    (typeof window !== "undefined" && window.__ENV?.NEXT_PUBLIC_SUPABASE_URL) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey =
    (typeof window !== "undefined" && window.__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, anonKey);
}
