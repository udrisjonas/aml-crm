import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";
import type { Role } from "@/types/roles";

export default async function UsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin client bypasses RLS — required to read all profiles/invites on this page.
  const admin = createAdminClient();

  const [
    { data: users,          error: usersError },
    { data: roles,          error: rolesError },
    { data: pendingInvites, error: pendingError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("*, user_roles!user_id(id, assigned_at, roles(id, name, description))")
      .order("created_at", { ascending: false }),

    admin
      .from("roles")
      .select("*")
      .order("name"),

    admin
      .from("pending_invites")
      .select("id, email, full_name, roles, created_at, last_sent_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);


  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage user accounts, roles, and access
        </p>
      </div>
      <UsersManager
        initialUsers={
          (users ?? []) as Parameters<typeof UsersManager>[0]["initialUsers"]
        }
        allRoles={(roles ?? []) as Role[]}
        initialPendingInvites={
          (pendingInvites ?? []) as Parameters<
            typeof UsersManager
          >[0]["initialPendingInvites"]
        }
      />
    </div>
  );
}
