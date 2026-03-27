import "@/app/globals.css";
import { createClient } from "@/lib/supabase/server";
import { RolesProvider } from "@/context/RolesContext";
import Sidebar from "@/components/Sidebar";
import type { RoleName } from "@/types/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let roles: RoleName[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    roles = (data ?? [])
      .map((r) => ((r as unknown as { roles: { name: RoleName } }).roles?.name))
      .filter((n): n is RoleName => !!n);
  }

  return (
    <RolesProvider initialRoles={roles}>
      <div className="flex min-h-screen">
        <Sidebar userEmail={user?.email ?? ""} />
        <main className="flex-1 bg-slate-50 overflow-auto">
          {children}
        </main>
      </div>
    </RolesProvider>
  );
}
