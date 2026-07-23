import { redirect } from "next/navigation";

import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await resolvePostLoginPath(supabase));
  }

  redirect("/auth/login");
}
