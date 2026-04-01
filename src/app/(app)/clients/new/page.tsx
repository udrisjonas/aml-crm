import { createAdminClient } from "@/lib/supabase/admin";
import NewClientWizard from "./NewClientWizard";

export const dynamic = "force-dynamic";

export interface RelationshipOption {
  value: string;
  label_lt: string;
  label_en: string;
}

export interface BrokerOption {
  id: string;
  full_name: string | null;
}

function parseOptions(raw: unknown): RelationshipOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is RelationshipOption =>
      typeof o === "object" && o !== null && "value" in o && "label_lt" in o && "label_en" in o
  );
}

export default async function NewClientPage() {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("company_settings")
    .select("tenant_type")
    .single();

  const tenantType = settings?.tenant_type ?? "real_estate";

  const { data: templateRows, error } = await admin
    .from("questionnaire_templates")
    .select("field_key, options_lt")
    .eq("tenant_type", tenantType)
    .in("field_key", [
      "relationship_purpose",
      "relationship_frequency",
      "relationship_use_individual",
    ]);

  if (error) {
    console.error("[NewClientPage] questionnaire_templates fetch error:", error);
  }

  const find = (key: string) =>
    parseOptions(templateRows?.find((r) => r.field_key === key)?.options_lt);

  // Fetch active broker users for the optional broker picker
  const { data: brokerRoles } = await admin
    .from("user_roles")
    .select("user_id, roles!inner(name)")
    .eq("roles.name", "broker");

  const brokerUserIds = (brokerRoles ?? []).map((r) => (r as { user_id: string }).user_id);
  let brokers: BrokerOption[] = [];
  if (brokerUserIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .in("id", brokerUserIds)
      .order("full_name");
    brokers = (data ?? []) as BrokerOption[];
  }

  return (
    <NewClientWizard
      purposeOptions={find("relationship_purpose")}
      frequencyOptions={find("relationship_frequency")}
      useOptions={find("relationship_use_individual")}
      brokers={brokers}
    />
  );
}
