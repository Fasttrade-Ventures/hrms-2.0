import Link from "next/link";

import { AuthGhostButton, AuthCardHeader } from "@/components/auth/auth-primitives";
import { AuthShell } from "@/components/auth/auth-shell";
import { dashboardPathForRoles } from "@/lib/auth/redirect";
import { getSession } from "@/lib/auth/session";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const dashboardHref = session
    ? dashboardPathForRoles(session.membership.roles)
    : "/auth/login";

  return (
    <AuthShell
      brand={{
        headline: "Access\nnot allowed.",
        subhead: "You are signed in, but this area belongs to a different role portal.",
        centered: true,
      }}
    >
      <AuthCardHeader
        subtitle={
          params.from
            ? `You tried to open ${params.from}. Go back to your dashboard or sign in with a different account.`
            : "Go back to your dashboard or contact your HR administrator if you need access."
        }
        title="Unauthorized"
      />

      <div className="space-y-3">
        <Link className="block" href={dashboardHref}>
          <AuthGhostButton type="button">Go to my dashboard</AuthGhostButton>
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            className="w-full text-center text-[13px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
            type="submit"
          >
            Sign out and use another account
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
