"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

export async function setAcknowledgmentRequirementAction(
  documentId: string,
  requiredRoles: string[],
  specificUserIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getUser();
    console.log("[setAcknowledgmentRequirementAction] called by user:", user.id, "| documentId:", documentId, "| requiredRoles:", requiredRoles, "| specificUserIds:", specificUserIds);
    const admin = createAdminClient();

    const { error } = await admin
      .from("document_acknowledgment_requirements")
      .upsert(
        {
          document_id:      documentId,
          required_roles:   requiredRoles,
          specific_user_ids: specificUserIds,
          created_by:       user.id,
        },
        { onConflict: "document_id" }
      );

    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents/aml");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function acknowledgeDocumentAction(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getUser();
    const admin = createAdminClient();

    // Fetch requirement
    const { data: req } = await admin
      .from("document_acknowledgment_requirements")
      .select("id")
      .eq("document_id", documentId)
      .maybeSingle();

    if (!req) return { ok: false, error: "No acknowledgment requirement found" };

    const { error } = await admin
      .from("document_acknowledgments")
      .upsert(
        {
          requirement_id:  req.id,
          document_id:     documentId,
          user_id:         user.id,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "document_id,user_id" }
      );

    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents/aml");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteAcknowledgmentRequirementAction(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await getUser();
    const admin = createAdminClient();
    const { error } = await admin
      .from("document_acknowledgment_requirements")
      .delete()
      .eq("document_id", documentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents/aml");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
