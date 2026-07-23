# Auth session policy

**Phase 1 decision (23 Jul 2026)**

## Remember me

The login form shows **“Keep me signed in on this device”** (checked by default).

| Setting | Behavior today |
|---------|----------------|
| Checked (default) | Standard Supabase SSR session cookies with refresh token rotation via middleware |
| Unchecked | Same session behavior for now; preference is logged in auth audit metadata |

**Why:** Supabase Auth with `@supabase/ssr` stores the session in HTTP-only cookies. There is no supported per-login “session-only cookie” without custom JWT expiry or a separate auth proxy.

**Future:** When we add idle timeout / security settings (Owner portal), honor unchecked state with shorter `maxAge` or forced re-auth after browser close.

## Session refresh

`middleware.ts` calls `supabase.auth.getUser()` on every request to refresh cookies.

## Sign out

`POST /api/auth/logout` clears the Supabase session and writes an `auth.logout` audit event.

## Password rules (reset, activate, change)

- Minimum 8 characters
- At least one uppercase letter
- At least one number

Matches Pencil **Auth / Reset Password** rule list.

## Protected auth routes

| Path | Anonymous | Signed in |
|------|-----------|-----------|
| `/auth/login` | ✅ | Redirect to dashboard |
| `/auth/forgot-password` | ✅ | Redirect to dashboard |
| `/auth/reset-password` | ✅ (email link) | Redirect to dashboard |
| `/auth/activate` | ✅ (invite link) | Allowed during activation |
| `/auth/change-password` | ❌ → login | ✅ |

## Role guards

Portal prefixes (`/employee`, `/manager`, `/hr`, …) require a matching role in `organization_memberships.roles`. Otherwise → `/unauthorized`.

See `apps/web/src/lib/auth/routes.ts`.
