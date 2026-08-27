import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Thin wrapper so tests can mock middleware Supabase construction without
 * relying on vitest inlining of `@supabase/ssr`.
 */
export function createMiddlewareSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  request: NextRequest,
  onResponse: (response: NextResponse) => void,
  initialResponse: NextResponse,
) {
  let supabaseResponse = initialResponse;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        onResponse(supabaseResponse);
      },
    },
  });

  return { supabase, getResponse: () => supabaseResponse };
}
