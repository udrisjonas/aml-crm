"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function completeInviteAction(password: string, fullName: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error("No active session");

  const admin = createAdminClient();

  // 1. Set the password via admin so no re-auth is required
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });
  if (pwError) throw new Error(pwError.message);

  // 2. Look up the pending invite
  const { data: invite, error: inviteError } = await admin
    .from("pending_invites")
    .select("id, full_name, roles")
    .eq("email", user.email)
    .is("accepted_at", null)
    .maybeSingle();

  if (inviteError) throw new Error(inviteError.message);

  // 3. Save full_name from the form (user-submitted), falling back to the invite
  //    record if the form value is blank (shouldn't happen but safe to guard).
  const resolvedName = fullName.trim() || invite?.full_name || "";
  await admin
    .from("profiles")
    .update({ full_name: resolvedName })
    .eq("id", user.id);

  if (invite && invite.roles.length > 0) {
    // 4. Resolve role names → UUIDs
    const { data: roleRows } = await admin
      .from("roles")
      .select("id, name")
      .in("name", invite.roles);

    // 5. Insert user_roles (ignore conflicts in case of retry)
    if (roleRows && roleRows.length > 0) {
      await admin.from("user_roles").upsert(
        roleRows.map((r) => ({ user_id: user.id, role_id: r.id })),
        { onConflict: "user_id,role_id", ignoreDuplicates: true }
      );
    }

    // 6. Mark invite accepted
    await admin
      .from("pending_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}
