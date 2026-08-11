import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mock definition to globalThis to completely avoid TDZ issues with hoisted vi.mock calls
vi.hoisted(() => {
  const queryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    // Query builder is thenable (awaitable)
    then: vi.fn().mockImplementation(function(this: any, resolve: any) {
      resolve({ data: client._mockData ?? [], error: client._mockError ?? null });
    }),
  };

  const client: any = {
    from: vi.fn().mockImplementation(function (this: any, tableName: string) {
      queryBuilder.tableName = tableName;
      return queryBuilder;
    }),
    auth: {
      admin: {
        generateLink: vi.fn(),
        getUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
      },
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    _mockData: null as any,
    _mockSingleData: null as any,
    _mockError: null as any,
  };

  (globalThis as any).mockSupabaseClient = client;
  (globalThis as any).queryBuilder = queryBuilder;
});

const mockSupabaseClient = (globalThis as any).mockSupabaseClient;
const queryBuilder = (globalThis as any).queryBuilder;

// Mock Next.js redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`Redirect to: ${url}`);
  }),
}));

// Mock Next.js headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// Mock Supabase servers and ssr using global mockSupabaseClient
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => (globalThis as any).mockSupabaseClient),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue((globalThis as any).mockSupabaseClient),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => (globalThis as any).mockSupabaseClient),
}));

// Mock Platform Mailing
vi.mock("@hrms/platform", () => ({
  sendEmployeeActivationEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

// Mock Audit Logs
vi.mock("@/lib/audit/log-employee-event", () => ({
  logEmployeeEvent: vi.fn(),
}));

vi.mock("@/lib/audit/log-auth-event", () => ({
  logAuthEvent: vi.fn(),
}));

// Mock Webhooks
vi.mock("@/lib/integrations/webhooks/emit", () => ({
  emitEmployeeWebhook: vi.fn(),
}));

// Mock next/server Request/Response
vi.mock("next/server", () => {
  class MockNextResponse {
    headers = new Headers();
    cookies = {
      set: vi.fn(),
    };
    static next() {
      return new MockNextResponse();
    }
    static redirect(url: string | URL) {
      const res = new MockNextResponse();
      res.headers.set("Location", url.toString());
      return res;
    }
  }

  return {
    NextRequest: class {
      url: string;
      nextUrl: URL & { clone: () => URL };
      cookies = {
        getAll: () => [],
        set: () => {},
      };
      constructor(url: string) {
        this.url = url;
        const parsed = new URL(url);
        (parsed as any).clone = () => new URL(url);
        this.nextUrl = parsed as any;
      }
    },
    NextResponse: MockNextResponse,
  };
});

// Import modules under test
import { createEmployeeRecord, resendEmployeeActivationEmail } from "@/lib/employees/create-employee";
import { activateAccount, changePassword } from "@/app/(auth)/auth/actions";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/middleware";
import { sendEmployeeActivationEmail } from "@hrms/platform";
import { isPublicAuthPath } from "@/lib/auth/routes";
import { NextRequest, NextResponse } from "next/server";

// Helper to catch and assert Next.js redirects
async function expectRedirect(fn: () => Promise<any>, targetUrl: string) {
  try {
    await fn();
    throw new Error("Expected function to redirect, but it completed successfully");
  } catch (error: any) {
    const isRedirectError = 
      error.message === "NEXT_REDIRECT" || 
      error.message.includes("Redirect to:") ||
      error.digest?.startsWith("NEXT_REDIRECT");
    
    if (isRedirectError) {
      const location = error.digest || error.message;
      expect(location).toContain(targetUrl);
    } else {
      throw error;
    }
  }
}

describe("employee activation and auth flows", () => {
  beforeAll(() => {
    process.env.DEFAULT_ORGANIZATION_ID = "org-123";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-key";
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient._mockData = null;
    mockSupabaseClient._mockSingleData = null;
    mockSupabaseClient._mockError = null;

    // Reset database chainable methods
    queryBuilder.select = vi.fn().mockReturnThis();
    queryBuilder.insert = vi.fn().mockReturnThis();
    queryBuilder.update = vi.fn().mockReturnThis();
    queryBuilder.delete = vi.fn().mockReturnThis();
    queryBuilder.eq = vi.fn().mockReturnThis();
    queryBuilder.or = vi.fn().mockReturnThis();

    // Recreate mock functions for each run to avoid queue accumulation
    queryBuilder.single = vi.fn().mockImplementation(() => Promise.resolve({ data: mockSupabaseClient._mockSingleData ?? { id: "emp-123" }, error: mockSupabaseClient._mockError ?? null }));
    queryBuilder.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve({ data: mockSupabaseClient._mockSingleData ?? null, error: mockSupabaseClient._mockError ?? null }));

    queryBuilder.then = vi.fn().mockImplementation(function(this: any, resolve: any) {
      resolve({ data: mockSupabaseClient._mockData ?? [], error: mockSupabaseClient._mockError ?? null });
    });

    mockSupabaseClient.auth.admin.generateLink = vi.fn().mockResolvedValue({
      data: {
        user: { id: "user-123" },
        properties: { 
          action_link: "http://localhost:3000/auth/callback?code=123",
          hashed_token: "mock-hash-123",
        },
      },
      error: null,
    });

    mockSupabaseClient.auth.admin.getUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockSupabaseClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });

    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockSupabaseClient.auth.updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    mockSupabaseClient.auth.signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } }, error: null });
  });

  describe("1. Activation Email (HR Side)", () => {
    it("generates an invite link and sends activation email when creating an employee", async () => {
      queryBuilder.maybeSingle.mockImplementation(function (this: any) {
        if (this.tableName === "organizations") {
          return Promise.resolve({ data: { name: "Mock Org" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await createEmployeeRecord(
        {
          fullName: "Alex Smith",
          email: "alex@example.com",
          joinDate: "2026-08-11",
          sendActivationEmail: true,
          allowedLeaveTypeIds: [],
        },
        "actor-123"
      );

      expect(mockSupabaseClient.auth.admin.generateLink).toHaveBeenCalledWith({
        type: "invite",
        email: "alex@example.com",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?next=/auth/activate",
          data: { full_name: "Alex Smith" },
        },
      });

      expect(sendEmployeeActivationEmail).toHaveBeenCalledWith({
        to: "alex@example.com",
        fullName: "Alex Smith",
        organizationName: "Mock Org",
        activationLink: "http://localhost:3000/auth/confirm?token_hash=mock-hash-123&type=invite&next=/auth/activate",
      });

      expect(result.activationEmailSent).toBe(true);
    });

    it("resends activation email successfully", async () => {
      queryBuilder.maybeSingle.mockImplementation(function (this: any) {
        if (this.tableName === "employees") {
          return Promise.resolve({
            data: {
              email: "alex@example.com",
              full_name: "Alex Smith",
            },
            error: null,
          });
        }
        if (this.tableName === "organizations") {
          return Promise.resolve({ data: { name: "Mock Org" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await resendEmployeeActivationEmail("emp-123", "actor-123");

      expect(result.sent).toBe(true);
      expect(sendEmployeeActivationEmail).toHaveBeenCalled();
    });
  });

  describe("2. Password Setup (activateAccount)", () => {
    it("fails password setup if passwords do not match", async () => {
      const formData = new FormData();
      formData.append("fullName", "Alex Smith");
      formData.append("password", "SecurePass1!");
      formData.append("confirmPassword", "DifferentPass1!");

      const state = await activateAccount({}, formData);
      expect(state.error).toBe("Passwords do not match.");
    });

    it("fails password setup if password is too weak (no uppercase)", async () => {
      const formData = new FormData();
      formData.append("fullName", "Alex Smith");
      formData.append("password", "weakpass123");
      formData.append("confirmPassword", "weakpass123");

      const state = await activateAccount({}, formData);
      expect(state.error).toBe("Password must include at least one uppercase letter.");
    });

    it("succeeds with strong passwords, updates user, and redirects", async () => {
      mockSupabaseClient._mockData = [{ roles: ["employee"] }];

      const formData = new FormData();
      formData.append("fullName", "Alex Smith");
      formData.append("password", "SecurePass1!");
      formData.append("confirmPassword", "SecurePass1!");

      await expectRedirect(
        () => activateAccount({}, formData),
        "/employee/dashboard"
      );

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "SecurePass1!",
        data: { full_name: "Alex Smith" },
      });
    });
  });

  describe("3. Login Redirect (resolvePostLoginPath)", () => {
    it("redirects employee user to /employee/dashboard", async () => {
      mockSupabaseClient._mockData = [{ roles: ["employee"] }];
      const path = await resolvePostLoginPath(mockSupabaseClient as any);
      expect(path).toBe("/employee/dashboard");
    });

    it("redirects hr administrator user to /hr/dashboard", async () => {
      mockSupabaseClient._mockData = [{ roles: ["hr_administrator"] }];
      const path = await resolvePostLoginPath(mockSupabaseClient as any);
      expect(path).toBe("/hr/dashboard");
    });

    it("redirects user without memberships to login page error", async () => {
      mockSupabaseClient._mockData = [];
      const path = await resolvePostLoginPath(mockSupabaseClient as any);
      expect(path).toBe("/auth/login?error=no_membership");
    });
  });

  describe("4. Password Change (changePassword)", () => {
    it("fails password change if current password is wrong", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid login credentials") as any,
      });

      const formData = new FormData();
      formData.append("currentPassword", "WrongPass1!");
      formData.append("password", "NewSecurePass2!");
      formData.append("confirmPassword", "NewSecurePass2!");

      const state = await changePassword({}, formData);
      expect(state.error).toBe("Current password is incorrect.");
    });

    it("succeeds when inputs are valid, updates password, and redirects", async () => {
      mockSupabaseClient._mockData = [{ roles: ["employee"] }];

      const formData = new FormData();
      formData.append("currentPassword", "SecurePass1!");
      formData.append("password", "NewSecurePass2!");
      formData.append("confirmPassword", "NewSecurePass2!");

      await expectRedirect(
        () => changePassword({}, formData),
        "/employee/dashboard"
      );

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "NewSecurePass2!",
      });
    });
  });

  describe("5. Session Validation / Middleware", () => {
    it("allows access to public auth paths without redirecting", async () => {
      // Mock no user logged in
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new NextRequest("http://localhost:3000/auth/login");
      const response = await updateSession(request);

      // Should not contain Location header for redirect
      expect(response.headers.get("Location")).toBeNull();
    });

    it("redirects unauthenticated users attempting to access dashboard to login", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new NextRequest("http://localhost:3000/employee/dashboard");
      const response = await updateSession(request);

      expect(response.headers.get("Location")).toBe("http://localhost:3000/auth/login?next=%2Femployee%2Fdashboard");
    });

    it("redirects authenticated users away from public auth paths to home", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockSupabaseClient._mockSingleData = { roles: ["employee"] };

      const request = new NextRequest("http://localhost:3000/auth/login");
      const response = await updateSession(request);

      expect(response.headers.get("Location")).toBe("http://localhost:3000/");
    });
  });
});
