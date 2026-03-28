"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUserScope() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map(
    (r) => ((r as unknown as { roles: { name: string } }).roles?.name ?? "")
  );

  const isBroker =
    roleNames.includes("broker") &&
    !roleNames.includes("system_admin") &&
    !roleNames.includes("aml_officer") &&
    !roleNames.includes("senior_manager");

  return { user, isBroker };
}

export interface ClientSearchResult {
  id: string;
  client_type: string;
  kyc_status: string | null;
  risk_rating: string | null;
  first_name: string;
  last_name: string;
  broker_name: string | null;
}

export async function searchClientsAction(
  query: string
): Promise<ClientSearchResult[]> {
  if (!query.trim()) return [];

  const { user, isBroker } = await getUserScope();
  const admin = createAdminClient();

  const { data: matches } = await admin
    .from("individual_details")
    .select("client_id, first_name, last_name")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(20);

  if (!matches || matches.length === 0) return [];

  const matchedIds = matches.map((m) => m.client_id);

  let clientQ = admin
    .from("clients")
    .select(
      "id, client_type, kyc_status, risk_rating, broker:profiles!assigned_broker_id(full_name)"
    )
    .in("id", matchedIds)
    .eq("tenant_id", "default");

  if (isBroker) {
    clientQ = clientQ.eq("assigned_broker_id", user.id) as typeof clientQ;
  }

  const { data: clients } = await clientQ.limit(8);

  if (!clients) return [];

  return clients.map((c) => {
    const detail = matches.find((m) => m.client_id === c.id);
    const broker = Array.isArray(c.broker) ? c.broker[0] : c.broker;
    return {
      id: c.id,
      client_type: c.client_type,
      kyc_status: c.kyc_status,
      risk_rating: c.risk_rating,
      first_name: detail?.first_name ?? "",
      last_name: detail?.last_name ?? "",
      broker_name:
        (broker as { full_name: string | null } | null)?.full_name ?? null,
    };
  });
}

export async function dismissNotificationAction(
  notificationType: string,
  referenceId: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const admin = createAdminClient();
  await admin.from("notification_dismissals").upsert(
    {
      user_id: user.id,
      notification_type: notificationType,
      reference_id: referenceId,
    },
    { onConflict: "user_id,notification_type,reference_id" }
  );

  revalidatePath("/dashboard");
}
