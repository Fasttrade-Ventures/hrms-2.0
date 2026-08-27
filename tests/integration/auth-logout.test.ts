import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/audit/log-auth-event", () => ({
  logAuthEvent: vi.fn(),
}));

const getUser = vi.fn();
const signOut = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser, signOut },
  })),
}));

import { GET, POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: null } });
    signOut.mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("redirects to login with 303 so the browser follows with GET", async () => {
    const response = await POST(
      new Request("https://hrms.asyrafdigital.com/api/auth/logout", { method: "POST" }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("https://hrms.asyrafdigital.com/auth/login");
  });
});

describe("GET /api/auth/logout", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: null } });
    signOut.mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("redirects to login with 303", async () => {
    const response = await GET(new Request("https://hrms.asyrafdigital.com/api/auth/logout"));

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("https://hrms.asyrafdigital.com/auth/login");
  });
});
