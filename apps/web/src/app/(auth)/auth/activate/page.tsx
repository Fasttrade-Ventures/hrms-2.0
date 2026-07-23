import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthGhostButton, AuthCardHeader } from "@/components/auth/auth-primitives";
import { dashboardPathForRoles } from "@/lib/auth/redirect";
import { formatPrimaryRoleLabel } from "@/lib/auth/role-labels";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { ActivateAccountForm } from "./activate-form";

async function getActivateContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const session = await getSession();

  if (!session) {
    return { user, membership: null, organizationName: "Your organization" };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", session.membership.organizationId)
    .maybeSingle();

  return {
    user: session.user,
    membership: session.membership,
    organizationName: organization?.name ?? "Your organization",
  };
}

export default async function ActivatePage() {
  const context = await getActivateContext();

  if (!context?.user) {
    return (
      <AuthShell
        brand={{
          headline: "Welcome to\nyour workplace.",
          subhead: "Open the activation link from your HR invitation email to continue.",
          centered: true,
        }}
      >
        <AuthCardHeader
          subtitle="If your link expired, ask your HR administrator to resend the invitation."
          title="Activation link required"
        />
        <Link className="block" href="/auth/login">
          <AuthGhostButton type="button">Back to sign in</AuthGhostButton>
        </Link>
      </AuthShell>
    );
  }

  if (!context.membership) {
    redirect("/auth/login?error=no_membership");
  }

  const roleLabel = formatPrimaryRoleLabel(context.membership.roles);

  return (
    <AuthShell
      brand={{
        headline: "Welcome to\nyour workplace.",
        subhead: `You’ve been invited to ${context.organizationName}. Confirm your details and create a password to activate access.`,
        inviteMeta: {
          organizationName: context.organizationName,
          roleLabel,
        },
      }}
    >
      <ActivateAccountForm
        defaultFullName={context.user.fullName ?? ""}
        email={context.user.email ?? ""}
      />
    </AuthShell>
  );
}
