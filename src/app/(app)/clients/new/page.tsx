import { createAdminClient } from "@/lib/supabase/admin";
import NewClientWizard from "./NewClientWizard";

export const dynamic = "force-dynamic";

export interface RelationshipOption {
  value: string;
  label_lt: string;
  label_en: string;
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

  return (
    <NewClientWizard
      purposeOptions={find("relationship_purpose")}
      frequencyOptions={find("relationship_frequency")}
      useOptions={find("relationship_use_individual")}
    />
  );
}
