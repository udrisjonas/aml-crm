import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";
import type { Role } from "@/types/roles";

export const dynamic = "force-dynamic";

function serializeError(err: unknown): string {
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : Object(err)));
  } catch {
    return String(err);
  }
}

export default async function UsersPage() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Admin client bypasses RLS — required to read all profiles/invites on this page.
    const admin = createAdminClient();

    // Each query is isolated so a single failing column/relation doesn't crash the page.
    let users: Parameters<typeof UsersManager>[0]["initialUsers"] = [];
    try {
      const { data, error } = await admin
        .from("profiles")
        .select("*, user_roles!user_id(id, assigned_at, roles(id, name, description))")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[UsersPage] profiles query error:", serializeError(error));
      } else if (data) {
        users = data as typeof users;
      }
    } catch (err) {
      console.error("[UsersPage] profiles query threw:", serializeError(err));
    }

    let roles: Role[] = [];
    try {
      const { data, error } = await admin.from("roles").select("*").order("name");
      if (error) {
        console.error("[UsersPage] roles query error:", serializeError(error));
      } else if (data) {
        roles = data as Role[];
      }
    } catch (err) {
      console.error("[UsersPage] roles query threw:", serializeError(err));
    }

    // pending_invites: last_sent_at may be missing if migration 003 was not applied.
    let pendingInvites: { id: string; email: string; full_name: string; roles: string[]; created_at: string }[] = [];
    try {
      const { data, error } = await admin
        .from("pending_invites")
        .select("id, email, full_name, roles, created_at")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[UsersPage] pending_invites query error:", serializeError(error));
      } else if (data) {
        pendingInvites = data;
      }
    } catch (err) {
      console.error("[UsersPage] pending_invites query threw:", serializeError(err));
    }

    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage user accounts, roles, and access
          </p>
        </div>
        <UsersManager
          initialUsers={users}
          allRoles={roles}
          initialPendingInvites={
            pendingInvites as Parameters<typeof UsersManager>[0]["initialPendingInvites"]
          }
        />
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[UsersPage] FATAL unhandled error:", serializeError(err));

    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl">
          <h1 className="text-lg font-bold text-red-800 mb-2">Users page failed to load</h1>
          <p className="text-sm text-red-700 mb-3">
            An error occurred while loading this page. The full error has been logged to the server console.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <pre className="text-xs bg-red-100 text-red-900 rounded p-3 overflow-auto whitespace-pre-wrap">
              {message}
            </pre>
          )}
          <p className="text-xs text-red-500 mt-3">
            Check Vercel function logs for: <code>[UsersPage] FATAL</code>
          </p>
        </div>
      </div>
    );
  }
}
