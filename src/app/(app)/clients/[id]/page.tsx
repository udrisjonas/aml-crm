import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ClientDetail from "./ClientDetail";
import type { RelationshipOption } from "@/app/(app)/clients/new/page";

function parseOptions(raw: unknown): RelationshipOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is RelationshipOption =>
      typeof o === "object" && o !== null && "value" in o && "label_lt" in o && "label_en" in o
  );
}

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const [
    { data: client, error: clientError },
    { data: documents },
    { data: fieldChanges },
    { data: activeToken },
    { data: companySettings },
  ] = await Promise.all([
    admin
      .from("clients")
      .select(`
        id, client_type, kyc_status, edd_status, risk_rating, client_status,
        is_represented, created_at, updated_at, notes,
        individual_details(*),
        broker:profiles!assigned_broker_id(id, full_name, email),
        client_representatives(*),
        client_originals_verified(
          id, verified_by, verified_at, notes,
          verifier:profiles!verified_by(full_name)
        )
      `)
      .eq("id", params.id)
      .single(),
    admin
      .from("client_documents")
      .select("*, uploader:profiles!uploaded_by(full_name)")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    admin
      .from("client_field_changes")
      .select("*")
      .eq("client_id", params.id)
      .order("changed_at", { ascending: false })
      .limit(200),
    admin
      .from("client_kyc_tokens")
      .select("id, token, language, created_at, expires_at")
      .eq("client_id", params.id)
      .eq("is_active", true)
      .eq("token_type", "kyc")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("company_settings").select("tenant_type").single(),
  ]);

  const tenantType = companySettings?.tenant_type ?? "real_estate";
  const clientAppliesTo =
    (client as { client_type?: string } | null)?.client_type === "legal_entity"
      ? "company"
      : "individual";

  const { data: templateRows } = await admin
    .from("questionnaire_templates")
    .select("field_key, options_lt")
    .eq("tenant_type", tenantType)
    .in("field_key", [
      "relationship_purpose",
      "relationship_frequency",
      clientAppliesTo === "individual" ? "relationship_use_individual" : "relationship_use_legal_entity",
    ]);

  const find = (key: string) =>
    parseOptions(templateRows?.find((r) => r.field_key === key)?.options_lt);

  const purposeOptions = find("relationship_purpose");
  const frequencyOptions = find("relationship_frequency");
  const useOptions = find(
    clientAppliesTo === "individual" ? "relationship_use_individual" : "relationship_use_legal_entity"
  );

  if (clientError || !client) redirect("/clients");

  // Normalise PostgREST embeds (1:1 joins may come as array or object)
  function one<T>(v: T | T[] | null): T | null {
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  }

  const normalised = {
    ...client,
    individual_details: one(client.individual_details as never),
    broker: one(client.broker as never),
    client_representatives: (client.client_representatives ?? []) as unknown[],
    client_originals_verified: ((client.client_originals_verified ?? []) as unknown[]).map(
      (v: unknown) => {
        const rec = v as Record<string, unknown>;
        return { ...rec, verifier: one(rec.verifier as never) };
      }
    ),
  };

  return (
    <ClientDetail
      client={normalised as never}
      documents={(documents ?? []) as never}
      fieldChanges={(fieldChanges ?? []) as never}
      activeToken={(activeToken ?? null) as never}
      purposeOptions={purposeOptions}
      frequencyOptions={frequencyOptions}
      useOptions={useOptions}
    />
  );
}
