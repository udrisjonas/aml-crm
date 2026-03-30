import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ClientsTable, { type ClientRow } from "./ClientsTable";
import { extractRoleName } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Determine the user's roles to apply manual scoping on the admin client
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map(
    (r) => extractRoleName(r)
  );

  const isBroker = roleNames.includes("broker") && !roleNames.includes("system_admin") && !roleNames.includes("aml_officer") && !roleNames.includes("senior_manager");

  // Build query
  let query = admin
    .from("clients")
    .select(`
      id,
      client_type,
      kyc_status,
      risk_rating,
      client_status,
      created_at,
      assigned_broker_id,
      individual_details(first_name, last_name),
      broker:profiles!assigned_broker_id(full_name)
    `)
    .eq("tenant_id", "default")
    .order("created_at", { ascending: false });

  // Brokers only see their own clients
  if (isBroker) {
    query = query.eq("assigned_broker_id", user.id) as typeof query;
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ClientsPage] fetch error:", error);
  }

  // Normalise the Supabase response shape to ClientRow[]
  const clients: ClientRow[] = (data ?? []).map((row) => {
    // individual_details comes back as an array from a 1:1 embed
    const details = Array.isArray(row.individual_details)
      ? (row.individual_details[0] ?? null)
      : (row.individual_details ?? null);

    const broker = Array.isArray(row.broker)
      ? (row.broker[0] ?? null)
      : (row.broker ?? null);

    return {
      id:                row.id,
      client_type:       row.client_type,
      kyc_status:        row.kyc_status,
      risk_rating:       row.risk_rating,
      client_status:     row.client_status,
      created_at:        row.created_at,
      individual_details: details as { first_name: string; last_name: string } | null,
      broker:             broker as { full_name: string | null } | null,
    };
  });

  return <ClientsTable clients={clients} />;
}
