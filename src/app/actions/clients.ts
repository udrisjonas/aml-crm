"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

// ══════════════════════════════════════════════════════════════════════════════
// Create individual client
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateIndividualClientData {
  first_name: string;
  last_name: string;
  is_lithuanian_resident: boolean;
  personal_id_number: string;
  date_of_birth: string;
  foreign_id_number: string;
  nationality: string;
  is_stateless: boolean;
  id_issuing_country: string;
  country_of_residence: string;
  residential_address: string;
  same_correspondence: boolean;
  correspondence_address: string;
  id_document_type: string;
  id_document_number: string;
  id_issue_date: string;
  id_document_expiry: string;
  id_issuing_country_doc: string;
  phone: string;
  email: string;
  is_represented: boolean;
  rep_first_name: string;
  rep_last_name: string;
  rep_personal_id: string;
  rep_date_of_birth: string;
  rep_nationality: string;
  rep_relationship_type: string;
  rep_notes: string;
  acting_on_own_behalf: boolean;
  beneficial_owner_info: string;
  pep_status: string;
  pep_self_declared: boolean;
  pep_details: string;
  occupation: string;
  source_of_funds: string;
  source_of_wealth: string;
  purpose_of_relationship: string;
  relationship_frequency: string;
  relationship_use: string;
  risk_rating: string;
  notes: string;
}

export async function createIndividualClientAction(
  data: CreateIndividualClientData
): Promise<{ error: string } | void> {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map(
    (r) => ((r as unknown as { roles: { name: string } }).roles?.name ?? "")
  );
  const isBroker = roleNames.includes("broker");

  let newClientId: string;

  try {
    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({
        tenant_id: "default",
        client_type: "individual",
        assigned_broker_id: isBroker ? user.id : null,
        created_by: user.id,
        is_represented: data.is_represented,
        risk_rating: data.risk_rating || "not_assessed",
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (clientError) return { error: clientError.message };
    newClientId = client.id;

    const { error: detailsError } = await admin
      .from("individual_details")
      .insert({
        client_id: newClientId,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        is_lithuanian_resident: data.is_lithuanian_resident,
        personal_id_number: data.is_lithuanian_resident ? (data.personal_id_number || null) : null,
        date_of_birth: !data.is_lithuanian_resident && data.date_of_birth ? data.date_of_birth : null,
        foreign_id_number: !data.is_lithuanian_resident ? (data.foreign_id_number || null) : null,
        nationality: data.nationality || null,
        is_stateless: data.is_stateless,
        country_of_residence: data.country_of_residence || null,
        residential_address: data.residential_address || null,
        correspondence_address: data.same_correspondence
          ? data.residential_address || null
          : data.correspondence_address || null,
        id_document_type: data.id_document_type || null,
        id_document_number: data.id_document_number || null,
        id_issue_date: data.id_issue_date || null,
        id_document_expiry: data.id_document_expiry || null,
        id_issuing_country: data.id_issuing_country_doc || null,
        phone: data.phone || null,
        email: data.email || null,
        acting_on_own_behalf: data.acting_on_own_behalf,
        beneficial_owner_info: !data.acting_on_own_behalf ? (data.beneficial_owner_info || null) : null,
        pep_status: data.pep_status || "unknown",
        pep_self_declared: data.pep_self_declared,
        pep_details: data.pep_status === "yes" ? (data.pep_details || null) : null,
        occupation: data.occupation || null,
        source_of_funds: data.source_of_funds || null,
        source_of_wealth: data.source_of_wealth || null,
        purpose_of_relationship: data.purpose_of_relationship || null,
        relationship_frequency: data.relationship_frequency || null,
        relationship_use: data.relationship_use || null,
      });

    if (detailsError) {
      await admin.from("clients").delete().eq("id", newClientId);
      return { error: detailsError.message };
    }

    if (data.is_represented && data.rep_first_name && data.rep_last_name) {
      const { error: repError } = await admin
        .from("client_representatives")
        .insert({
          client_id: newClientId,
          first_name: data.rep_first_name.trim(),
          last_name: data.rep_last_name.trim(),
          personal_id_number: data.rep_personal_id || null,
          date_of_birth: data.rep_date_of_birth || null,
          nationality: data.rep_nationality || null,
          relationship_type: data.rep_relationship_type || "poa_holder",
          notes: data.rep_notes || null,
        });

      if (repError) return { error: repError.message };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error" };
  }

  redirect(`/clients/${newClientId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Status / risk updates
// ══════════════════════════════════════════════════════════════════════════════

export async function updateKycStatusAction(
  clientId: string,
  status: string
): Promise<{ error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ kyc_status: status, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function updateRiskRatingAction(
  clientId: string,
  rating: string
): Promise<{ error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ risk_rating: rating, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

// ══════════════════════════════════════════════════════════════════════════════
// Individual details update (inline edit)
// ══════════════════════════════════════════════════════════════════════════════

export interface IndividualDetailsUpdate {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string | null;
  personal_id_number?: string | null;
  foreign_id_number?: string | null;
  is_lithuanian_resident?: boolean;
  nationality?: string | null;
  is_stateless?: boolean;
  id_issuing_country?: string | null;
  country_of_residence?: string | null;
  residential_address?: string | null;
  correspondence_address?: string | null;
  id_document_type?: string | null;
  id_document_number?: string | null;
  id_issue_date?: string | null;
  id_document_expiry?: string | null;
  phone?: string | null;
  email?: string | null;
  acting_on_own_behalf?: boolean;
  beneficial_owner_info?: string | null;
  occupation?: string | null;
  source_of_funds?: string | null;
  source_of_wealth?: string | null;
  purpose_of_relationship?: string | null;
  relationship_frequency?: string | null;
  relationship_use?: string | null;
  pep_status?: string;
  pep_self_declared?: boolean;
  pep_details?: string | null;
}

export async function updateIndividualDetailsAction(
  detailsId: string,
  clientId: string,
  data: IndividualDetailsUpdate
): Promise<{ error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();
  const { error } = await admin
    .from("individual_details")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", detailsId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

// ══════════════════════════════════════════════════════════════════════════════
// Verification status (ID check, liveness, sanctions, adverse media, PEP)
// ══════════════════════════════════════════════════════════════════════════════

export interface VerificationStatusData {
  id_verified?: boolean;
  liveness_checked?: boolean;
  sanctions_status?: string;
  adverse_media_status?: string;
  pep_status?: string;
}

export async function updateVerificationStatusAction(
  detailsId: string,
  clientId: string,
  data: VerificationStatusData
): Promise<{ error?: string }> {
  const user = await getUser().catch(() => null);
  if (!user) return { error: "Unauthenticated" };
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};
  if (data.id_verified !== undefined) {
    update.id_verified = data.id_verified;
    update.id_verified_at = data.id_verified ? new Date().toISOString() : null;
    update.id_verified_by = data.id_verified ? user.id : null;
  }
  if (data.liveness_checked !== undefined) {
    update.liveness_checked = data.liveness_checked;
    update.liveness_checked_at = data.liveness_checked ? new Date().toISOString() : null;
  }
  if (data.sanctions_status !== undefined) update.sanctions_status = data.sanctions_status;
  if (data.adverse_media_status !== undefined) update.adverse_media_status = data.adverse_media_status;
  if (data.pep_status !== undefined) update.pep_status = data.pep_status;

  const { error } = await admin
    .from("individual_details")
    .update(update)
    .eq("id", detailsId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

// ══════════════════════════════════════════════════════════════════════════════
// Originals verification (immutable once set)
// ══════════════════════════════════════════════════════════════════════════════

export async function verifyOriginalsAction(
  clientId: string,
  notes?: string
): Promise<{ error?: string }> {
  const user = await getUser().catch(() => null);
  if (!user) return { error: "Unauthenticated" };
  const admin = createAdminClient();

  const { error: insertError } = await admin
    .from("client_originals_verified")
    .insert({ client_id: clientId, verified_by: user.id, notes: notes || null });
  if (insertError) return { error: insertError.message };

  await admin
    .from("clients")
    .update({ kyc_status: "broker_verified_originals", updated_at: new Date().toISOString() })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
  return {};
}

// ══════════════════════════════════════════════════════════════════════════════
// Documents
// ══════════════════════════════════════════════════════════════════════════════

export interface DocumentData {
  client_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  notes?: string;
}

export async function recordDocumentAction(
  data: DocumentData
): Promise<{ error?: string }> {
  const user = await getUser().catch(() => null);
  if (!user) return { error: "Unauthenticated" };
  const admin = createAdminClient();

  const { error } = await admin.from("client_documents").insert({
    ...data,
    tenant_id: "default",
    uploaded_by: user.id,
    uploaded_by_type: "broker",
  });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${data.client_id}`);
  return {};
}

export async function deleteDocumentAction(
  docId: string,
  filePath: string,
  clientId: string
): Promise<{ error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();

  await admin.storage.from("client-documents").remove([filePath]);
  const { error } = await admin.from("client_documents").delete().eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function getDocumentSignedUrlAction(
  filePath: string
): Promise<{ url?: string; error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("client-documents")
    .createSignedUrl(filePath, 300);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

// ══════════════════════════════════════════════════════════════════════════════
// KYC token generation & management
// ══════════════════════════════════════════════════════════════════════════════

export async function generateKycTokenAction(
  clientId: string,
  language: "lt" | "en",
  emailAddress: string
): Promise<{ url?: string; emailSent?: boolean; error?: string }> {
  const user = await getUser().catch(() => null);
  if (!user) return { error: "Unauthenticated" };
  const admin = createAdminClient();

  // Invalidate any existing active KYC tokens for this client
  await admin
    .from("client_kyc_tokens")
    .update({ is_active: false })
    .eq("client_id", clientId)
    .eq("is_active", true)
    .eq("token_type", "kyc");

  // Capture current kyc_status for audit log
  const { data: clientData } = await admin
    .from("clients")
    .select("kyc_status")
    .eq("id", clientId)
    .single();
  const prevStatus = clientData?.kyc_status ?? "draft";

  // Create new token (expires in 48 hours)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data: tokenRow, error: tokenError } = await admin
    .from("client_kyc_tokens")
    .insert({
      client_id: clientId,
      token_type: "kyc",
      language,
      expires_at: expiresAt,
      is_active: true,
      created_by: user.id,
    })
    .select("token")
    .single();
  if (tokenError) return { error: tokenError.message };

  // Update KYC status
  await admin
    .from("clients")
    .update({ kyc_status: "sent_to_client", updated_at: new Date().toISOString() })
    .eq("id", clientId);

  // Log field change
  if (prevStatus !== "sent_to_client") {
    await admin.from("client_field_changes").insert({
      client_id: clientId,
      field_name: "kyc_status",
      old_value: prevStatus,
      new_value: "sent_to_client",
      changed_by_type: "broker",
      changed_by: user.id,
    });
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/kyc/${tokenRow.token}`;

  // Attempt email send (non-fatal)
  let emailSent = false;
  try {
    const { sendKycEmail } = await import("@/lib/email");
    const { data: details } = await admin
      .from("individual_details")
      .select("first_name, last_name")
      .eq("client_id", clientId)
      .single();
    const { data: settings } = await admin
      .from("company_settings")
      .select("company_name")
      .single();
    await sendKycEmail({
      to: emailAddress,
      clientName: details ? `${details.first_name} ${details.last_name}` : "Client",
      kycUrl: url,
      language,
      companyName: settings?.company_name ?? "Your broker",
    });
    emailSent = true;
  } catch {
    // Email failure is non-fatal; broker can copy the link manually
  }

  revalidatePath(`/clients/${clientId}`);
  return { url, emailSent };
}

export async function invalidateKycTokenAction(
  tokenId: string,
  clientId: string
): Promise<{ error?: string }> {
  try { await getUser(); } catch { return { error: "Unauthenticated" }; }
  const admin = createAdminClient();

  await admin.from("client_kyc_tokens").update({ is_active: false }).eq("id", tokenId);

  const { data: clientData } = await admin
    .from("clients")
    .select("kyc_status")
    .eq("id", clientId)
    .single();
  if (clientData?.kyc_status === "sent_to_client") {
    await admin
      .from("clients")
      .update({ kyc_status: "draft", updated_at: new Date().toISOString() })
      .eq("id", clientId);
  }

  revalidatePath(`/clients/${clientId}`);
  return {};
}

// ══════════════════════════════════════════════════════════════════════════════
// Public KYC form submission (no auth — uses token for authorization)
// ══════════════════════════════════════════════════════════════════════════════

export interface KycFormSubmission {
  token: string;
  // Personal
  first_name: string;
  last_name: string;
  nationality: string | null;
  country_of_residence: string | null;
  residential_address: string | null;
  correspondence_address: string | null;
  phone: string | null;
  email: string | null;
  // Acting on own behalf
  acting_on_own_behalf: boolean;
  beneficial_owner_info: string | null;
  // PEP
  pep_status: string;
  pep_self_declared: boolean;
  pep_details: string | null;
  // High risk
  has_high_risk_country_connections: boolean;
  high_risk_country_details: string | null;
  // Cash
  cash_transactions_above_threshold: boolean;
  // Source of funds
  occupation: string | null;
  source_of_funds: string | null;
  source_of_wealth: string | null;
  // Purpose
  purpose_of_relationship: string | null;
  relationship_frequency: string | null;
  relationship_use: string | null;
  // Signature
  ip_address: string | null;
  declaration_text: string;
}

export async function submitKycFormAction(
  data: KycFormSubmission
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Validate token
  const { data: tokenRow, error: tokenError } = await admin
    .from("client_kyc_tokens")
    .select("id, client_id, is_active, expires_at")
    .eq("token", data.token)
    .single();

  if (tokenError || !tokenRow) return { error: "Invalid or expired link." };
  if (!tokenRow.is_active) return { error: "This link has already been used or invalidated." };
  if (new Date(tokenRow.expires_at) < new Date()) return { error: "This link has expired." };

  const clientId = tokenRow.client_id;
  const tokenId = tokenRow.id;

  // Fetch current individual_details for diff
  const { data: current } = await admin
    .from("individual_details")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (!current) return { error: "Client record not found." };

  const trackableFields: Array<{ key: keyof KycFormSubmission; label: string }> = [
    { key: "first_name",                       label: "first_name" },
    { key: "last_name",                        label: "last_name" },
    { key: "nationality",                      label: "nationality" },
    { key: "country_of_residence",             label: "country_of_residence" },
    { key: "residential_address",              label: "residential_address" },
    { key: "correspondence_address",           label: "correspondence_address" },
    { key: "phone",                            label: "phone" },
    { key: "email",                            label: "email" },
    { key: "acting_on_own_behalf",             label: "acting_on_own_behalf" },
    { key: "beneficial_owner_info",            label: "beneficial_owner_info" },
    { key: "pep_status",                       label: "pep_status" },
    { key: "pep_self_declared",                label: "pep_self_declared" },
    { key: "pep_details",                      label: "pep_details" },
    { key: "has_high_risk_country_connections", label: "has_high_risk_country_connections" },
    { key: "high_risk_country_details",        label: "high_risk_country_details" },
    { key: "cash_transactions_above_threshold", label: "cash_transactions_above_threshold" },
    { key: "occupation",                       label: "occupation" },
    { key: "source_of_funds",                  label: "source_of_funds" },
    { key: "source_of_wealth",                 label: "source_of_wealth" },
    { key: "purpose_of_relationship",          label: "purpose_of_relationship" },
    { key: "relationship_frequency",           label: "relationship_frequency" },
    { key: "relationship_use",                 label: "relationship_use" },
  ];

  const changes: Array<{
    client_id: string; token_id: string;
    field_name: string; old_value: string | null; new_value: string | null;
    changed_by_type: string;
  }> = [];

  for (const { key, label } of trackableFields) {
    const oldVal = String(current[label as keyof typeof current] ?? "");
    const newVal = String(data[key] ?? "");
    if (oldVal !== newVal) {
      changes.push({
        client_id: clientId,
        token_id: tokenId,
        field_name: label,
        old_value: oldVal || null,
        new_value: newVal || null,
        changed_by_type: "client",
      });
    }
  }

  // Update individual_details
  const { error: updateError } = await admin
    .from("individual_details")
    .update({
      first_name:                        data.first_name,
      last_name:                         data.last_name,
      nationality:                       data.nationality,
      country_of_residence:              data.country_of_residence,
      residential_address:               data.residential_address,
      correspondence_address:            data.correspondence_address,
      phone:                             data.phone,
      email:                             data.email,
      acting_on_own_behalf:              data.acting_on_own_behalf,
      beneficial_owner_info:             data.beneficial_owner_info,
      pep_status:                        data.pep_status,
      pep_self_declared:                 data.pep_self_declared,
      pep_details:                       data.pep_details,
      has_high_risk_country_connections: data.has_high_risk_country_connections,
      high_risk_country_details:         data.high_risk_country_details,
      cash_transactions_above_threshold: data.cash_transactions_above_threshold,
      occupation:                        data.occupation,
      source_of_funds:                   data.source_of_funds,
      source_of_wealth:                  data.source_of_wealth,
      purpose_of_relationship:           data.purpose_of_relationship,
      relationship_frequency:            data.relationship_frequency,
      relationship_use:                  data.relationship_use,
      updated_at:                        new Date().toISOString(),
    })
    .eq("client_id", clientId);

  if (updateError) return { error: updateError.message };

  // Insert field change rows
  if (changes.length > 0) {
    await admin.from("client_field_changes").insert(changes);
  }

  // Log kyc_status change
  await admin.from("client_field_changes").insert({
    client_id: clientId,
    token_id: tokenId,
    field_name: "kyc_status",
    old_value: "sent_to_client",
    new_value: "client_completed",
    changed_by_type: "client",
  });

  // Insert KYC signature
  await admin.from("client_kyc_signatures").insert({
    client_id: clientId,
    token_id: tokenId,
    signed_by_name: `${data.first_name} ${data.last_name}`,
    ip_address: data.ip_address,
    is_representative: false,
    declaration_text: data.declaration_text,
  });

  // Mark token as used
  await admin
    .from("client_kyc_tokens")
    .update({ used_at: new Date().toISOString(), is_active: false })
    .eq("id", tokenId);

  // Update client status
  await admin
    .from("clients")
    .update({ kyc_status: "client_completed", updated_at: new Date().toISOString() })
    .eq("id", clientId);

  return {};
}

// ── Signed upload URL for public KYC document uploads ─────────────────────

export async function getClientSignedUploadUrlAction(
  token: string,
  filePath: string
): Promise<{ signedUrl?: string; error?: string }> {
  const admin = createAdminClient();

  // Validate token
  const { data: tokenRow } = await admin
    .from("client_kyc_tokens")
    .select("id, client_id, is_active, expires_at")
    .eq("token", token)
    .single();

  if (!tokenRow?.is_active || new Date(tokenRow.expires_at) < new Date()) {
    return { error: "Invalid or expired link." };
  }

  const { data, error } = await admin.storage
    .from("client-documents")
    .createSignedUploadUrl(filePath);

  if (error) return { error: error.message };
  return { signedUrl: data.signedUrl };
}

export async function recordClientDocumentAction(
  kycToken: string,
  docData: DocumentData
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("client_kyc_tokens")
    .select("id, client_id, is_active, expires_at")
    .eq("token", kycToken)
    .single();

  if (!tokenRow?.is_active || new Date(tokenRow.expires_at) < new Date()) {
    return { error: "Invalid or expired link." };
  }

  const { error } = await admin.from("client_documents").insert({
    ...docData,
    tenant_id: "default",
    uploaded_by_type: "client",
  });
  if (error) return { error: error.message };
  return {};
}
