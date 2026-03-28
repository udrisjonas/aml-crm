import "@/app/globals.css";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RolesProvider } from "@/context/RolesContext";
import Sidebar from "@/components/Sidebar";
import TrialBanner from "@/components/TrialBanner";
import TrialExpiredScreen from "@/components/TrialExpiredScreen";
import type { RoleName } from "@/types/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const admin = createAdminClient();

  const [
    { data: { user } },
    { data: settings },
  ] = await Promise.all([
    supabase.auth.getUser(),
    admin
      .from("company_settings")
      .select("company_name, logo_url")
      .eq("tenant_id", "default")
      .maybeSingle(),
  ]);

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

  // ── Subscription / Trial ──────────────────────────────────────────────
  let subscription = await admin
    .from("tenant_subscriptions")
    .select("*")
    .eq("tenant_id", "default")
    .maybeSingle()
    .then((r) => r.data);

  // Auto-create 14-day trial on first load
  if (!subscription) {
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const { data: created } = await admin
      .from("tenant_subscriptions")
      .insert({
        tenant_id: "default",
        status: "trial",
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
      .select()
      .single();
    subscription = created;
  }

  // Compute trial days remaining (null when not in trial)
  let trialDaysRemaining: number | null = null;
  if (subscription?.status === "trial" && subscription.trial_end) {
    const msLeft = new Date(subscription.trial_end).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    // Auto-lock when trial has expired
    if (trialDaysRemaining === 0) {
      await admin
        .from("tenant_subscriptions")
        .update({ status: "locked" })
        .eq("tenant_id", "default");
      subscription = { ...subscription, status: "locked" };
    }
  }

  // Determine if the user is locked out
  const isLocked = subscription?.status === "locked";

  // Allow /billing even when locked (so user can select a plan)
  const pathname = headers().get("x-pathname") ?? "";
  const isBillingPage = pathname.startsWith("/billing");

  // Load plans for the lockout screen
  const { data: plans } = isLocked && !isBillingPage
    ? await admin.from("plans").select("*").eq("is_active", true).order("monthly_fee")
    : { data: [] };

  return (
    <RolesProvider initialRoles={roles}>
      <div className="flex min-h-screen bg-stone-50">
        <Sidebar
          userEmail={user?.email ?? ""}
          logoUrl={settings?.logo_url ?? null}
          companyName={settings?.company_name ?? null}
          trialDaysRemaining={trialDaysRemaining}
        />
        <main className="flex-1 bg-stone-50 overflow-auto flex flex-col">
          {trialDaysRemaining !== null && trialDaysRemaining <= 4 && trialDaysRemaining > 0 && (
            <TrialBanner daysRemaining={trialDaysRemaining} />
          )}
          {isLocked && !isBillingPage ? (
            <TrialExpiredScreen
              plans={plans ?? []}
              userEmail={user?.email ?? ""}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </RolesProvider>
  );
}
