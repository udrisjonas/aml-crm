"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEddEmail } from "@/lib/email";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

// ── Send EDD to client ────────────────────────────────────────────────────────

export async function sendEddToClientAction(
  clientId: string,
  language: "lt" | "en" = "lt"
): Promise<{ ok: true; url: string; emailSent: boolean } | { ok: false; error: string }> {
  try {
    await getUser();
    const admin = createAdminClient();

    const { data: client } = await admin
      .from("clients")
      .select("id, edd_status, individual_details(first_name, last_name, email)")
      .eq("id", clientId)
      .single();

    if (!client) return { ok: false, error: "Client not found" };

    const details = Array.isArray(client.individual_details)
      ? client.individual_details[0]
      : client.individual_details;

    const clientEmail = (details as { email?: string | null })?.email ?? null;
    const firstName   = (details as { first_name?: string })?.first_name ?? "";
    const lastName    = (details as { last_name?: string })?.last_name ?? "";
    const clientName  = `${firstName} ${lastName}`.trim() || "Client";

    // Reuse existing questionnaire if it hasn't been fully completed yet
    const existingRes = await admin
      .from("edd_questionnaires")
      .select("id, token, status")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let eddId: string;
    let token: string;

    if (existingRes.data && existingRes.data.status !== "completed") {
      eddId = existingRes.data.id;
      token = existingRes.data.token;
      await admin
        .from("edd_questionnaires")
        .update({ status: "sent_to_client", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", eddId);
    } else {
      const { data: newEdd, error: createErr } = await admin
        .from("edd_questionnaires")
        .insert({ client_id: clientId, status: "sent_to_client", triggered_reason: "pep", sent_at: new Date().toISOString() })
        .select("id, token")
        .single();
      if (createErr || !newEdd) return { ok: false, error: createErr?.message ?? "Failed to create EDD questionnaire" };
      eddId = newEdd.id;
      token = newEdd.token;
    }

    await admin
      .from("clients")
      .update({ edd_status: "sent_to_client", updated_at: new Date().toISOString() })
      .eq("id", clientId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eddUrl = `${appUrl}/edd/${token}`;

    let emailSent = false;
    if (clientEmail) {
      const { data: companySettings } = await admin.from("company_settings").select("company_name").single();
      try {
        await sendEddEmail({ to: clientEmail, clientName, eddUrl, language, companyName: companySettings?.company_name ?? "AML Compliance" });
        emailSent = true;
      } catch { /* email failure is non-fatal */ }
    }

    revalidatePath(`/clients/${clientId}`);
    return { ok: true, url: eddUrl, emailSent };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Public: submit EDD form (no auth, token-gated) ───────────────────────────

export async function submitEddFormAction(
  token: string,
  responses: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();

    const { data: edd } = await admin
      .from("edd_questionnaires")
      .select("id, client_id, status")
      .eq("token", token)
      .maybeSingle();

    if (!edd) return { ok: false, error: "Invalid or expired link" };
    if (edd.status === "completed") return { ok: false, error: "This questionnaire has already been completed" };
    if (edd.status !== "sent_to_client" && edd.status !== "triggered") return { ok: false, error: "This link is no longer valid" };

    const responseRows = Object.entries(responses)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([question_key, answer]) => ({ edd_questionnaire_id: edd.id, question_key, answer }));

    if (responseRows.length > 0) {
      const { error: respErr } = await admin
        .from("edd_responses")
        .upsert(responseRows, { onConflict: "edd_questionnaire_id,question_key" });
      if (respErr) return { ok: false, error: respErr.message };
    }

    const now = new Date().toISOString();
    await admin
      .from("edd_questionnaires")
      .update({ status: "client_completed", client_completed_at: now, updated_at: now })
      .eq("id", edd.id);

    await admin
      .from("clients")
      .update({ edd_status: "client_completed", updated_at: now })
      .eq("id", edd.client_id);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Public: get signed upload URL ────────────────────────────────────────────

export async function getEddSignedUploadUrlAction(
  token: string,
  fileName: string
): Promise<{ ok: true; signedUrl: string; path: string } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();

    const { data: edd } = await admin
      .from("edd_questionnaires")
      .select("id, client_id, status")
      .eq("token", token)
      .maybeSingle();

    if (!edd) return { ok: false, error: "Invalid link" };
    if (edd.status !== "sent_to_client" && edd.status !== "triggered") return { ok: false, error: "This link is no longer valid" };

    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `edd/${edd.client_id}/${edd.id}/${Date.now()}_${sanitized}`;

    const { data, error } = await admin.storage.from("client-documents").createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: error?.message ?? "Could not create upload URL" };

    return { ok: true, signedUrl: data.signedUrl, path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Public: record uploaded EDD document ─────────────────────────────────────

export async function recordEddDocumentAction(
  token: string,
  file: { file_name: string; file_path: string; file_size?: number; mime_type?: string; request_id?: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();

    const { data: edd } = await admin
      .from("edd_questionnaires")
      .select("id, client_id, status")
      .eq("token", token)
      .maybeSingle();

    if (!edd) return { ok: false, error: "Invalid link" };

    const { data, error } = await admin.from("edd_documents").insert({
      edd_questionnaire_id: edd.id,
      client_id:           edd.client_id,
      file_name:           file.file_name,
      file_path:           file.file_path,
      file_size:           file.file_size ?? null,
      mime_type:           file.mime_type ?? null,
      request_id:          file.request_id ?? null,
      uploaded_by_type:    "client",
    }).select("id").single();

    if (error || !data) return { ok: false, error: error?.message ?? "Failed to record document" };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── AML officer: manage document requests ────────────────────────────────────

export async function createEddDocumentRequestAction(
  eddId: string,
  clientId: string,
  documentName: string,
  description: string,
  isRequired: boolean,
  sortOrder: number
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await getUser();
    const admin = createAdminClient();

    const { data, error } = await admin.from("edd_document_requests").insert({
      edd_questionnaire_id: eddId,
      document_name:        documentName.trim(),
      description:          description.trim() || null,
      is_required:          isRequired,
      sort_order:           sortOrder,
    }).select("id").single();

    if (error || !data) return { ok: false, error: error?.message ?? "Failed to create request" };

    revalidatePath(`/clients/${clientId}`);
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteEddDocumentRequestAction(
  requestId: string,
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getUser();
    const admin = createAdminClient();

    const { error } = await admin.from("edd_document_requests").delete().eq("id", requestId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── AML officer: get signed download URL for document review ─────────────────

export async function getEddDocumentUrlAction(
  documentId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await getUser();
    const admin = createAdminClient();

    const { data: doc } = await admin
      .from("edd_documents")
      .select("file_path")
      .eq("id", documentId)
      .single();

    if (!doc) return { ok: false, error: "Document not found" };

    const { data, error } = await admin.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 300); // 5-minute expiry

    if (error || !data) return { ok: false, error: error?.message ?? "Could not create URL" };
    return { ok: true, url: data.signedUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── AML officer: review document ─────────────────────────────────────────────

export async function reviewEddDocumentAction(
  documentId: string,
  clientId: string,
  status: "accepted" | "rejected",
  notes: string,
  rejectionReason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getUser();
    const admin = createAdminClient();

    const { error } = await admin.from("edd_documents").update({
      review_status:           status,
      review_notes:            notes.trim() || null,
      review_rejection_reason: status === "rejected" ? (rejectionReason ?? null) : null,
      reviewed_by:             user.id,
      reviewed_at:             new Date().toISOString(),
    }).eq("id", documentId);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── AML officer: submit assessment ───────────────────────────────────────────

export async function submitAmlOfficerAssessmentAction(
  eddId: string,
  clientId: string,
  notes: string,
  recommendation: "approve" | "escalate" | "reject"
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getUser();
    const admin = createAdminClient();

    const now = new Date().toISOString();
    const newEddStatus      = recommendation === "escalate" ? "escalated" : "completed";
    const newClientEddStatus = recommendation === "escalate" ? "under_review" : "completed";

    await admin.from("edd_questionnaires").update({
      status:                     newEddStatus,
      aml_officer_user_id:        user.id,
      aml_officer_notes:          notes,
      aml_officer_recommendation: recommendation,
      aml_officer_reviewed_at:    now,
      updated_at:                 now,
    }).eq("id", eddId);

    await admin.from("clients").update({ edd_status: newClientEddStatus, updated_at: now }).eq("id", clientId);

    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Senior manager: submit decision ──────────────────────────────────────────

export async function submitSeniorManagerDecisionAction(
  eddId: string,
  clientId: string,
  notes: string,
  decision: "approved" | "rejected"
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getUser();
    const admin = createAdminClient();

    const now = new Date().toISOString();

    await admin.from("edd_questionnaires").update({
      status:                    "completed",
      senior_manager_user_id:    user.id,
      senior_manager_notes:      notes,
      senior_manager_decision:   decision,
      senior_manager_reviewed_at: now,
      updated_at:                now,
    }).eq("id", eddId);

    await admin.from("clients").update({ edd_status: "completed", updated_at: now }).eq("id", clientId);

    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Resend EDD email (preserves existing responses) ──────────────────────────

export async function resendEddAction(
  clientId: string,
  eddId: string,
  language: "lt" | "en" = "lt"
): Promise<{ ok: true; emailSent: boolean } | { ok: false; error: string }> {
  try {
    await getUser();
    const admin = createAdminClient();

    const { data: edd } = await admin
      .from("edd_questionnaires")
      .select("token, status")
      .eq("id", eddId)
      .single();

    if (!edd) return { ok: false, error: "EDD questionnaire not found" };

    const { data: client } = await admin
      .from("clients")
      .select("individual_details(first_name, last_name, email)")
      .eq("id", clientId)
      .single();

    const details    = Array.isArray((client as { individual_details: unknown })?.individual_details)
      ? ((client as { individual_details: unknown[] }).individual_details)[0]
      : (client as { individual_details: unknown })?.individual_details;
    const clientEmail = (details as { email?: string | null })?.email ?? null;
    if (!clientEmail) return { ok: false, error: "Client has no email address" };

    const firstName  = (details as { first_name?: string })?.first_name ?? "";
    const lastName   = (details as { last_name?: string })?.last_name ?? "";
    const clientName = `${firstName} ${lastName}`.trim() || "Client";

    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eddUrl  = `${appUrl}/edd/${edd.token}`;

    const { data: companySettings } = await admin.from("company_settings").select("company_name").single();

    await sendEddEmail({ to: clientEmail, clientName, eddUrl, language, companyName: companySettings?.company_name ?? "AML Compliance" });

    // Only update sent_at — do NOT reset token or delete responses
    await admin.from("edd_questionnaires").update({ sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", eddId);

    revalidatePath(`/clients/${clientId}`);
    return { ok: true, emailSent: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
