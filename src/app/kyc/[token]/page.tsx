import { createAdminClient } from "@/lib/supabase/admin";
import KycForm from "./KycForm";

export const dynamic = "force-dynamic";

export interface RelationshipOption {
  value: string;
  label_lt: string;
  label_en: string;
}

interface PageProps {
  params: { token: string };
}

/** Parse rich options stored as [{value, label_lt, label_en}] in options_lt column. */
function parseOptions(raw: unknown): RelationshipOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is RelationshipOption =>
      typeof o === "object" && o !== null && "value" in o && "label_lt" in o && "label_en" in o
  );
}

export default async function KycTokenPage({ params }: PageProps) {
  const admin = createAdminClient();

  // Fetch via security definer function (anon-safe, validates is_active + expires_at)
  const { data, error } = await admin.rpc("get_client_by_token", {
    p_token: params.token,
  });

  if (error || !data) {
    return <ExpiredPage />;
  }

  // Fetch company name + tenant_type for branding and template selection
  const { data: settings } = await admin
    .from("company_settings")
    .select("company_name, tenant_type")
    .single();

  const companyName = settings?.company_name ?? "";
  const tenantType = settings?.tenant_type ?? "real_estate";
  const clientAppliesTo =
    (data.client as { client_type?: string })?.client_type === "legal_entity"
      ? "company"
      : "individual";

  // Fetch relationship_purpose section options from questionnaire_templates
  const { data: templateRows } = await admin
    .from("questionnaire_templates")
    .select("field_key, options_lt")
    .eq("tenant_type", tenantType)
    .in("field_key", [
      "relationship_purpose",
      "relationship_frequency",
      clientAppliesTo === "individual"
        ? "relationship_use_individual"
        : "relationship_use_legal_entity",
    ]);

  const findOptions = (key: string) =>
    parseOptions(templateRows?.find((r) => r.field_key === key)?.options_lt);

  const relationshipPurposeOptions = findOptions("relationship_purpose");
  const relationshipFrequencyOptions = findOptions("relationship_frequency");
  const relationshipUseOptions = findOptions(
    clientAppliesTo === "individual"
      ? "relationship_use_individual"
      : "relationship_use_legal_entity"
  );

  return (
    <KycForm
      token={params.token}
      tokenId={data.token_id as string}
      language={data.language as "lt" | "en"}
      expiresAt={data.expires_at as string}
      clientData={data.client as { id: string; kyc_status: string; is_represented: boolean }}
      details={data.individual_details as Record<string, unknown>}
      companyName={companyName}
      relationshipPurposeOptions={relationshipPurposeOptions}
      relationshipFrequencyOptions={relationshipFrequencyOptions}
      relationshipUseOptions={relationshipUseOptions}
    />
  );
}

function ExpiredPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-lg w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Link expired or invalid</h1>
        <p className="text-slate-600 leading-relaxed">
          This link has expired or is no longer valid. Please contact your broker to receive a new KYC link.
        </p>
        <hr className="border-slate-100" />
        <p className="text-slate-500 text-sm font-medium">Nuoroda nebegalioja</p>
        <p className="text-slate-500 text-sm leading-relaxed">
          Ši nuoroda nebegalioja arba yra neteisinga. Kreipkitės į savo maklerį, kad gautumėte naują KYC anketą.
        </p>
      </div>
    </div>
  );
}
