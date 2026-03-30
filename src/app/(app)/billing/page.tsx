import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const admin = createAdminClient();
  const supabase = createClient();

  const [
    { data: plans },
    { data: subscription },
    { data: settings },
    { data: { user } },
  ] = await Promise.all([
    admin.from("plans").select("id, name, monthly_fee, included_clients, is_active").eq("is_active", true).order("monthly_fee"),
    admin.from("tenant_subscriptions").select("id, tenant_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, created_at").eq("tenant_id", "default").maybeSingle(),
    admin.from("company_settings").select("vat_number, vat_country, country").eq("tenant_id", "default").maybeSingle(),
    supabase.auth.getUser(),
  ]);

  // Count active clients
  let activeClientCount = 0;
  if (user) {
    const { count } = await admin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .neq("status", "archived");
    activeClientCount = count ?? 0;
  }

  return (
    <BillingClient
      plans={plans ?? []}
      subscription={subscription ?? {
        id: "",
        plan_id: null,
        status: "trial",
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
      }}
      activeClientCount={activeClientCount}
      companySettings={settings ?? null}
    />
  );
}
