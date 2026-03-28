"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

async function assertBillingRole() {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const names = (data ?? []).map(
    (r) => ((r as unknown as { roles: { name: string } }).roles?.name)
  );
  const allowed = names.includes("system_admin") || names.includes("senior_manager");
  if (!allowed) throw new Error("Forbidden");
  return user;
}

export async function selectPlanAction(planId: string): Promise<void> {
  await assertBillingRole();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tenant_subscriptions")
    .update({
      plan_id: planId,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("tenant_id", "default");

  if (error) throw new Error(error.message);
  revalidatePath("/billing");
  revalidatePath("/", "layout");
}

export async function cancelSubscriptionAction(): Promise<void> {
  await assertBillingRole();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tenant_subscriptions")
    .update({ status: "cancelled" })
    .eq("tenant_id", "default");

  if (error) throw new Error(error.message);
  revalidatePath("/billing");
  revalidatePath("/", "layout");
}
