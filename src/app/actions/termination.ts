"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractRoleName } from "@/types/database";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUserWithRoles() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map((r) => extractRoleName(r));

  return {
    user,
    isAmlOfficer: roleNames.includes("aml_officer"),
    isBroker: roleNames.includes("broker"),
    isSystemAdmin: roleNames.includes("system_admin"),
  };
}

// ── AML reason lookup ─────────────────────────────────────────────────────────

const AML_REASONS = new Set([
  "cdd_not_completed",
  "suspicious_activity",
  "sanctions_pep_concerns",
  "refused_information",
  "other_aml_reason",
]);

// ── Archive match type ────────────────────────────────────────────────────────

export interface ArchiveMatch {
  id: string;
  first_name: string;
  last_name: string;
  archived_at: string | null;
  termination_reason: string | null;
  termination_category: string | null;
  revival_requires_aml_review: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// terminateClientAction
// ══════════════════════════════════════════════════════════════════════════════

export async function terminateClientAction(
  clientId: string,
  reason: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  let user;
  try { ({ user } = await getUserWithRoles()); }
  catch { return { ok: false, error: "Unauthenticated" }; }

  const admin = createAdminClient();
  const isAml = AML_REASONS.has(reason);
  const category = isAml ? "aml" : "normal";
  const now = new Date().toISOString();

  const { error } = await admin
    .from("clients")
    .update({
      client_status: "archived",
      archived_at: now,
      archived_by: user.id,
      termination_reason: reason,
      termination_notes: notes.trim() || null,
      termination_category: category,
      revival_requires_aml_review: isAml,
      updated_at: now,
    })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");

  return { ok: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// checkArchiveMatchAction
// ══════════════════════════════════════════════════════════════════════════════

export async function checkArchiveMatchAction(params: {
  email?: string;
  personalCode?: string;
  documentNumber?: string;
}): Promise<{ match: ArchiveMatch | null }> {
  const { email, personalCode, documentNumber } = params;

  const emailVal = email?.trim() ?? "";
  const pcVal = personalCode?.trim() ?? "";
  const docVal = documentNumber?.trim() ?? "";

  if (!emailVal && !pcVal && !docVal) return { match: null };

  const admin = createAdminClient();

  // Build OR conditions against individual_details
  const orParts: string[] = [];
  if (emailVal) orParts.push(`email.eq.${emailVal}`);
  if (pcVal)    orParts.push(`personal_id_number.eq.${pcVal}`);
  if (docVal)   orParts.push(`id_document_number.eq.${docVal}`);

  const { data: details } = await admin
    .from("individual_details")
    .select("client_id, first_name, last_name")
    .or(orParts.join(","))
    .limit(10);

  if (!details || details.length === 0) return { match: null };

  const clientIds = details.map((d) => d.client_id);

  const { data: archivedClient } = await admin
    .from("clients")
    .select("id, client_status, archived_at, termination_reason, termination_category, revival_requires_aml_review")
    .in("id", clientIds)
    .eq("client_status", "archived")
    .limit(1)
    .maybeSingle();

  if (!archivedClient) return { match: null };

  const detail = details.find((d) => d.client_id === archivedClient.id);
  if (!detail) return { match: null };

  return {
    match: {
      id: archivedClient.id,
      first_name: detail.first_name,
      last_name: detail.last_name,
      archived_at: archivedClient.archived_at,
      termination_reason: archivedClient.termination_reason,
      termination_category: archivedClient.termination_category,
      revival_requires_aml_review: archivedClient.revival_requires_aml_review,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// reviveClientAction
// ══════════════════════════════════════════════════════════════════════════════

export async function reviveClientAction(params: {
  archivedClientId: string;
  justification?: string;
}): Promise<{
  ok: boolean;
  newClientId?: string;
  revivalId?: string;
  requiresReview?: boolean;
  requiresAmlOfficer?: boolean;
  error?: string;
}> {
  let user, isAmlOfficer, isSystemAdmin;
  try {
    ({ user, isAmlOfficer, isSystemAdmin } = await getUserWithRoles());
  } catch {
    return { ok: false, error: "Unauthenticated" };
  }

  const admin = createAdminClient();
  const { archivedClientId, justification } = params;

  const { data: archived } = await admin
    .from("clients")
    .select("*, individual_details(*)")
    .eq("id", archivedClientId)
    .single();

  if (!archived) return { ok: false, error: "Client not found" };
  if (archived.client_status !== "archived") return { ok: false, error: "Client is not archived" };

  const requiresReview = archived.revival_requires_aml_review;

  if (requiresReview && !isAmlOfficer && !isSystemAdmin) {
    // Broker trying to revive AML-terminated client
    return { ok: true, requiresAmlOfficer: true };
  }

  if (requiresReview) {
    // AML officer creates pending revival request
    const { data: revival, error: revivalErr } = await admin
      .from("client_revivals")
      .insert({
        original_client_id: archivedClientId,
        revived_by: user.id,
        revival_justification: justification?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (revivalErr || !revival) return { ok: false, error: revivalErr?.message ?? "Failed to create revival request" };

    revalidatePath("/");
    return { ok: true, revivalId: revival.id, requiresReview: true };
  }

  // Normal termination — create new client immediately
  return await _createNewClientFromArchived(archived, user.id, justification);
}

// ══════════════════════════════════════════════════════════════════════════════
// approveRevivalAction
// ══════════════════════════════════════════════════════════════════════════════

export async function approveRevivalAction(
  revivalId: string
): Promise<{ ok: boolean; newClientId?: string; error?: string }> {
  let user;
  try { ({ user } = await getUserWithRoles()); }
  catch { return { ok: false, error: "Unauthenticated" }; }

  const admin = createAdminClient();

  const { data: revival } = await admin
    .from("client_revivals")
    .select("*")
    .eq("id", revivalId)
    .single();

  if (!revival) return { ok: false, error: "Revival request not found" };
  if (revival.status !== "pending") return { ok: false, error: "Revival request is not pending" };

  const { data: archived } = await admin
    .from("clients")
    .select("*, individual_details(*)")
    .eq("id", revival.original_client_id)
    .single();

  if (!archived) return { ok: false, error: "Original client not found" };

  const result = await _createNewClientFromArchived(archived, user.id, revival.revival_justification);
  if (!result.ok) return result;

  // Update revival record
  await admin
    .from("client_revivals")
    .update({
      status: "approved",
      new_client_id: result.newClientId,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", revivalId);

  revalidatePath("/");
  return { ok: true, newClientId: result.newClientId };
}

// ══════════════════════════════════════════════════════════════════════════════
// rejectRevivalAction
// ══════════════════════════════════════════════════════════════════════════════

export async function rejectRevivalAction(
  revivalId: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  let user;
  try { ({ user } = await getUserWithRoles()); }
  catch { return { ok: false, error: "Unauthenticated" }; }

  const admin = createAdminClient();

  const { error } = await admin
    .from("client_revivals")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes.trim() || null,
    })
    .eq("id", revivalId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

// ── Internal: create new client from archived ─────────────────────────────────

async function _createNewClientFromArchived(
  archived: Record<string, unknown>,
  userId: string,
  justification?: string | null
): Promise<{ ok: boolean; newClientId?: string; error?: string }> {
  const admin = createAdminClient();

  const detailsRaw = archived.individual_details;
  const details = Array.isArray(detailsRaw) ? detailsRaw[0] : detailsRaw;

  const { data: newClient, error: clientErr } = await admin
    .from("clients")
    .insert({
      tenant_id: archived.tenant_id,
      client_type: archived.client_type,
      assigned_broker_id: archived.assigned_broker_id,
      kyc_status: "draft",
      edd_status: "not_required",
      risk_rating: "not_assessed",
      client_status: "active",
      is_represented: archived.is_represented,
      created_by: userId,
    })
    .select("id")
    .single();

  if (clientErr || !newClient) return { ok: false, error: clientErr?.message ?? "Failed to create client" };

  // Copy individual details (exclude pk and timestamps)
  if (details && typeof details === "object") {
    const {
      id: _id,
      client_id: _cid,
      created_at: _ca,
      updated_at: _ua,
      ...rest
    } = details as Record<string, unknown>;
    void _id; void _cid; void _ca; void _ua;

    await admin.from("individual_details").insert({
      ...rest,
      client_id: newClient.id,
    });
  }

  // Create approval revival record
  await admin.from("client_revivals").insert({
    original_client_id: archived.id as string,
    new_client_id: newClient.id,
    revived_by: userId,
    revival_justification: justification?.trim() ?? null,
    status: "approved",
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  });

  revalidatePath("/clients");
  revalidatePath("/");

  return { ok: true, newClientId: newClient.id };
}
