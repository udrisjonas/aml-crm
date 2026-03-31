"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { RoleName } from "@/types/roles";
import { extractRoleName } from "@/types/database";

async function assertSystemAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (data ?? []).some(
    (r) => extractRoleName(r) === "system_admin"
  );
  if (!isAdmin) throw new Error("Forbidden");

  return user;
}

// ── Method 1: Send invite email ───────────────────────────────────────────────

export async function inviteUserAction(
  email: string,
  fullName: string,
  roles: RoleName[]
) {
  const caller = await assertSystemAdmin();
  const admin = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error: inviteStoreError } = await admin
    .from("pending_invites")
    .upsert(
      {
        email,
        full_name: fullName,
        roles,
        created_by: caller.id,
        accepted_at: null,
      },
      { onConflict: "email" }
    );
  if (inviteStoreError) throw new Error(inviteStoreError.message);

  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm`,
    data: { full_name: fullName },
  });
  if (sendError) throw new Error(sendError.message);

  revalidatePath("/settings/users");
}

// ── Method 2: Generate invite link (no email sent) ───────────────────────────

export async function generateInviteLinkAction(
  email: string,
  fullName: string,
  roles: RoleName[]
): Promise<string> {
  const caller = await assertSystemAdmin();
  const admin = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error: inviteStoreError } = await admin
    .from("pending_invites")
    .upsert(
      {
        email,
        full_name: fullName,
        roles,
        created_by: caller.id,
        accepted_at: null,
      },
      { onConflict: "email" }
    );
  if (inviteStoreError) throw new Error(inviteStoreError.message);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}/auth/confirm`,
    },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/users");
  return data.properties.action_link;
}

// ── Method 3: Create user directly ───────────────────────────────────────────

export async function createUserDirectlyAction(
  email: string,
  fullName: string,
  password: string,
  roles: RoleName[]
): Promise<void> {
  const caller = await assertSystemAdmin();
  const admin = createAdminClient();

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) throw new Error(createError.message);

  const userId = userData.user.id;

  // The handle_new_user trigger creates the profile row; update full_name
  await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);

  if (roles.length > 0) {
    const { data: roleRows } = await admin
      .from("roles")
      .select("id, name")
      .in("name", roles);

    if (roleRows && roleRows.length > 0) {
      await admin.from("user_roles").upsert(
        roleRows.map((r) => ({ user_id: userId, role_id: r.id, assigned_by: caller.id })),
        { onConflict: "user_id,role_id", ignoreDuplicates: true }
      );
    }
  }

  revalidatePath("/settings/users");
}

// ── Pending invite management ─────────────────────────────────────────────────

export async function resendInviteEmailAction(inviteId: string): Promise<void> {
  await assertSystemAdmin();
  const admin = createAdminClient();

  const { data: invite, error: fetchError } = await admin
    .from("pending_invites")
    .select("email, full_name")
    .eq("id", inviteId)
    .single();
  if (fetchError || !invite) throw new Error("Invite not found");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo: `${siteUrl}/auth/confirm`,
    data: { full_name: invite.full_name },
  });
  if (sendError) throw new Error(sendError.message);

  await admin
    .from("pending_invites")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", inviteId);

  revalidatePath("/settings/users");
}

export async function resendInviteLinkAction(inviteId: string): Promise<string> {
  await assertSystemAdmin();
  const admin = createAdminClient();

  const { data: invite, error: fetchError } = await admin
    .from("pending_invites")
    .select("email, full_name")
    .eq("id", inviteId)
    .single();
  if (fetchError || !invite) throw new Error("Invite not found");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: invite.email,
    options: {
      data: { full_name: invite.full_name },
      redirectTo: `${siteUrl}/auth/confirm`,
    },
  });
  if (linkError) throw new Error(linkError.message);

  await admin
    .from("pending_invites")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", inviteId);

  revalidatePath("/settings/users");
  return data.properties.action_link;
}

export async function revokeInviteAction(inviteId: string): Promise<void> {
  await assertSystemAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("pending_invites")
    .delete()
    .eq("id", inviteId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/users");
}

// ── Role and status management ────────────────────────────────────────────────

export async function assignRoleAction(userId: string, roleId: string) {
  const caller = await assertSystemAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role_id: roleId, assigned_by: caller.id });

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function removeRoleAction(userRoleId: string) {
  await assertSystemAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", userRoleId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  await assertSystemAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      is_active:   isActive,
      archived_at: isActive ? null : new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}
