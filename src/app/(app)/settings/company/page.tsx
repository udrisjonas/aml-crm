import { createAdminClient } from "@/lib/supabase/admin";
import CompanySettingsForm from "./CompanySettingsForm";

export interface TenantTypeOption {
  value: string;
  display_name_lt: string;
  display_name_en: string;
}

export default async function CompanySettingsPage() {
  const admin = createAdminClient();

  const [{ data: settings }, { data: tenantRows }] = await Promise.all([
    admin
      .from("company_settings")
      .select("*")
      .eq("tenant_id", "default")
      .maybeSingle(),
    admin
      .from("tenant_type_defaults")
      .select("tenant_type, display_name_lt, display_name_en")
      .not("display_name_lt", "is", null),
  ]);

  // Deduplicate — one row per tenant_type (the table has multiple rows per type)
  const seen = new Set<string>();
  const tenantTypeOptions: TenantTypeOption[] = [];
  for (const row of tenantRows ?? []) {
    if (!seen.has(row.tenant_type)) {
      seen.add(row.tenant_type);
      tenantTypeOptions.push({
        value: row.tenant_type,
        display_name_lt: row.display_name_lt ?? row.tenant_type,
        display_name_en: row.display_name_en ?? row.tenant_type,
      });
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your company profile, address, and branding
        </p>
      </div>
      <CompanySettingsForm
        initialSettings={settings}
        tenantTypeOptions={tenantTypeOptions}
      />
    </div>
  );
}
