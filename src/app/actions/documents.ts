"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractRoleName } from "@/types/database";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

async function assertCanManage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const names = (data ?? []).map(
    (r) => extractRoleName(r)
  );

  if (!names.includes("system_admin") && !names.includes("senior_manager")) {
    throw new Error("Forbidden: requires system_admin or senior_manager role");
  }
  return user;
}

// ── Compliance document upload ────────────────────────────────────────────────

/** Returns a signed upload URL for the compliance-documents storage bucket. */
export async function getComplianceUploadUrlAction(
  path: string
): Promise<{ signedUrl?: string; token?: string; error?: string }> {
  try {
    await assertCanManage();
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("compliance-documents")
      .createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Failed to get upload URL" };
    return { signedUrl: data.signedUrl, token: data.token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export interface ComplianceDocumentInput {
  document_type: string;
  title: string;
  description?: string | null;
  version: string;
  version_number: number;
  status: "draft" | "active";
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  approval_date?: string | null;
  approved_by_name?: string | null;
  next_review_date?: string | null;
  changelog?: string | null;
}

/** Records a compliance document in the DB (call after storage upload). */
export async function recordComplianceDocumentAction(
  data: ComplianceDocumentInput
): Promise<{ id?: string; error?: string }> {
  try {
    const user = await assertCanManage();
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("compliance_documents")
      .insert({
        tenant_id:         "default",
        uploaded_by:       user.id,
        uploaded_at:       new Date().toISOString(),
        document_type:     data.document_type,
        title:             data.title,
        description:       data.description || null,
        version:           data.version,
        version_number:    data.version_number,
        status:            data.status,
        file_name:         data.file_name,
        file_path:         data.file_path,
        file_size:         data.file_size ?? null,
        mime_type:         data.mime_type ?? null,
        approval_date:     data.approval_date || null,
        approved_by_name:  data.approved_by_name || null,
        next_review_date:  data.next_review_date || null,
        changelog:         data.changelog || null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/documents/aml");
    revalidatePath("/dashboard");
    return { id: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Update non-file metadata (approval, review date, description). */
export async function updateComplianceDocumentMetadataAction(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    approval_date?: string | null;
    approved_by_name?: string | null;
    next_review_date?: string | null;
  }
): Promise<{ error?: string }> {
  try {
    await assertCanManage();
    const admin = createAdminClient();
    const { error } = await admin
      .from("compliance_documents")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/documents/aml");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Returns a 1-hour signed download URL for a compliance document. */
export async function getComplianceDocumentUrlAction(
  filePath: string
): Promise<{ url?: string; error?: string }> {
  try {
    await getUser();
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("compliance-documents")
      .createSignedUrl(filePath, 3600);
    if (error || !data) return { error: error?.message ?? "Failed to get download URL" };
    return { url: data.signedUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

// ── Responsible person actions ────────────────────────────────────────────────

/** Returns a signed upload URL for an appointment document. */
export async function getAppointmentUploadUrlAction(
  path: string
): Promise<{ signedUrl?: string; token?: string; error?: string }> {
  try {
    await assertCanManage();
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("compliance-documents")
      .createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Failed to get upload URL" };
    return { signedUrl: data.signedUrl, token: data.token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export interface ResponsiblePersonInput {
  user_id?: string | null;
  full_name: string;
  position: string;
  appointment_date: string;
  appointment_document_path?: string | null;
  appointment_document_name?: string | null;
  regulator_contact_email?: string | null;
  regulator_contact_phone?: string | null;
  regulator_name?: string | null;
}

/** Creates a new responsible person appointment, terminating the previous active one. */
export async function appointResponsiblePersonAction(
  data: ResponsiblePersonInput
): Promise<{ id?: string; error?: string }> {
  try {
    const user = await assertCanManage();
    const admin = createAdminClient();

    // Terminate existing active person
    await admin
      .from("responsible_persons")
      .update({
        status:             "terminated",
        termination_date:   data.appointment_date,
        termination_reason: "Replaced by new appointment",
        updated_at:         new Date().toISOString(),
      })
      .eq("tenant_id", "default")
      .eq("status", "active");

    // Create new
    const { data: row, error } = await admin
      .from("responsible_persons")
      .insert({
        tenant_id:                   "default",
        appointed_by:                user.id,
        user_id:                     data.user_id || null,
        full_name:                   data.full_name,
        position:                    data.position,
        appointment_date:            data.appointment_date,
        appointment_document_path:   data.appointment_document_path || null,
        appointment_document_name:   data.appointment_document_name || null,
        regulator_contact_email:     data.regulator_contact_email || null,
        regulator_contact_phone:     data.regulator_contact_phone || null,
        regulator_name:              data.regulator_name || "Finansinių nusikaltimų tyrimo tarnyba (FNTT)",
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/documents/aml");
    revalidatePath("/dashboard");
    return { id: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Updates a responsible person record (details, not re-appointment). */
export async function updateResponsiblePersonAction(
  id: string,
  data: Partial<ResponsiblePersonInput>
): Promise<{ error?: string }> {
  try {
    await assertCanManage();
    const admin = createAdminClient();
    const { error } = await admin
      .from("responsible_persons")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/documents/aml");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Returns a 1-hour signed download URL for an appointment document. */
export async function getResponsiblePersonDocumentUrlAction(
  filePath: string
): Promise<{ url?: string; error?: string }> {
  try {
    await getUser();
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("compliance-documents")
      .createSignedUrl(filePath, 3600);
    if (error || !data) return { error: error?.message ?? "Failed to get download URL" };
    return { url: data.signedUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
