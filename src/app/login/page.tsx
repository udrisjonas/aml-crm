import { createAdminClient } from "@/lib/supabase/admin";
import LoginForm from "./LoginForm";

// Force dynamic rendering — company name/logo are fetched from the DB and
// must reflect the latest company_settings on every request.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("company_settings")
    .select("company_name, logo_url")
    .eq("tenant_id", "default")
    .maybeSingle();

  return (
    <LoginForm
      logoUrl={settings?.logo_url ?? null}
      companyName={settings?.company_name ?? null}
    />
  );
}
