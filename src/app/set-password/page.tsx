import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SetPasswordForm from "./SetPasswordForm";
import type { RoleName } from "@/types/roles";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Your invite link has expired. Please request a new one."
        )
    );
  }

  const admin = createAdminClient();

  const [{ data: invite }, { data: settings }] = await Promise.all([
    admin
      .from("pending_invites")
      .select("full_name, roles")
      .eq("email", user.email)
      .is("accepted_at", null)
      .maybeSingle(),
    admin
      .from("company_settings")
      .select("company_name, logo_url")
      .eq("tenant_id", "default")
      .maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <SetPasswordForm
        email={user.email}
        fullName={invite?.full_name ?? ""}
        roles={(invite?.roles ?? []) as RoleName[]}
        logoUrl={settings?.logo_url ?? null}
        companyName={settings?.company_name ?? null}
      />
    </div>
  );
}
