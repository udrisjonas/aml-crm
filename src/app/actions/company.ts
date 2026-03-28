"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertSystemAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (data ?? []).some(
    (r) =>
      ((r as unknown as { roles: { name: string } }).roles?.name) ===
      "system_admin"
  );
  if (!isAdmin) throw new Error("Forbidden");
}

export interface CompanySettingsData {
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  tenant_type: string;
}

export async function saveCompanySettingsAction(
  data: CompanySettingsData
): Promise<void> {
  await assertSystemAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("company_settings").upsert(
    {
      tenant_id: "default",
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/settings/company");
  revalidatePath("/login");
  revalidatePath("/", "layout"); // revalidates the (app) layout so the sidebar updates
}
