import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SetPasswordForm from "./SetPasswordForm";
import type { RoleName } from "@/types/roles";

export default async function SetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("pending_invites")
    .select("full_name, roles")
    .eq("email", user.email)
    .is("accepted_at", null)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <SetPasswordForm
        email={user.email}
        fullName={invite?.full_name ?? ""}
        roles={(invite?.roles ?? []) as RoleName[]}
      />
    </div>
  );
}
