"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function completeInviteAction(password: string): Promise<void> {
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

  // 3. Update profile with the stored full_name (profile row was auto-created
  //    by the handle_new_user trigger when the invite was sent)
  await admin
    .from("profiles")
    .update({ full_name: invite?.full_name ?? "" })
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
