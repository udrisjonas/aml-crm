import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { extractRoleName } from "@/types/database";
import AmlDocumentsPage from "./AmlDocumentsPage";
import type { ComplianceDocument, ResponsiblePerson, ProfileOption } from "./AmlDocumentsPage";

export const dynamic = "force-dynamic";

export default async function AmlDocumentsServerPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (userRolesData ?? []).map(
    (r) => extractRoleName(r)
  );
  const canManage =
    roleNames.includes("system_admin") || roleNames.includes("senior_manager");

  // Fetch all compliance documents for this tenant
  const { data: docsRaw } = await admin
    .from("compliance_documents")
    .select("*")
    .eq("tenant_id", "default")
    .order("document_type")
    .order("version_number", { ascending: false });

  // Resolve uploader names
  const uploaderIds = Array.from(
    new Set(
      (docsRaw ?? [])
        .map((d: Record<string, unknown>) => d.uploaded_by as string)
        .filter(Boolean)
    )
  );
  const { data: uploaderProfiles } = uploaderIds.length > 0
    ? await admin.from("profiles").select("id, full_name").in("id", uploaderIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const uploaderMap: Record<string, string | null> = Object.fromEntries(
    (uploaderProfiles ?? []).map((p) => [p.id, p.full_name])
  );

  const documents: ComplianceDocument[] = (docsRaw ?? []).map((d: Record<string, unknown>) => ({
    id:                d.id as string,
    tenant_id:         d.tenant_id as string,
    document_type:     d.document_type as string,
    title:             d.title as string,
    description:       d.description as string | null,
    version:           d.version as string,
    version_number:    d.version_number as number,
    status:            d.status as "draft" | "active" | "superseded",
    file_name:         d.file_name as string,
    file_path:         d.file_path as string,
    file_size:         d.file_size as number | null,
    mime_type:         d.mime_type as string | null,
    uploaded_by:       d.uploaded_by as string | null,
    uploaded_at:       d.uploaded_at as string,
    approval_date:     d.approval_date as string | null,
    approved_by_name:  d.approved_by_name as string | null,
    next_review_date:  d.next_review_date as string | null,
    changelog:         d.changelog as string | null,
    superseded_at:     d.superseded_at as string | null,
    superseded_by:     d.superseded_by as string | null,
    created_at:        d.created_at as string,
    updated_at:        d.updated_at as string,
    uploader_name:     (d.uploaded_by as string | null)
      ? (uploaderMap[d.uploaded_by as string] ?? null)
      : null,
  }));

  // Fetch responsible persons history
  const { data: personsRaw } = await admin
    .from("responsible_persons")
    .select("*")
    .eq("tenant_id", "default")
    .order("appointment_date", { ascending: false });

  const appointedByIds = Array.from(
    new Set(
      (personsRaw ?? [])
        .map((r: Record<string, unknown>) => r.appointed_by as string)
        .filter(Boolean)
    )
  );
  const { data: appointedProfiles } = appointedByIds.length > 0
    ? await admin.from("profiles").select("id, full_name").in("id", appointedByIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const appointedMap: Record<string, string | null> = Object.fromEntries(
    (appointedProfiles ?? []).map((p) => [p.id, p.full_name])
  );

  const responsiblePersons: ResponsiblePerson[] = (personsRaw ?? []).map(
    (r: Record<string, unknown>) => ({
      id:                          r.id as string,
      tenant_id:                   r.tenant_id as string,
      user_id:                     r.user_id as string | null,
      full_name:                   r.full_name as string,
      position:                    r.position as string,
      appointment_date:            r.appointment_date as string,
      appointment_document_path:   r.appointment_document_path as string | null,
      appointment_document_name:   r.appointment_document_name as string | null,
      regulator_contact_email:     r.regulator_contact_email as string | null,
      regulator_contact_phone:     r.regulator_contact_phone as string | null,
      regulator_name:              r.regulator_name as string,
      status:                      r.status as "active" | "terminated",
      termination_date:            r.termination_date as string | null,
      termination_reason:          r.termination_reason as string | null,
      appointed_by:                r.appointed_by as string | null,
      created_at:                  r.created_at as string,
      appointed_by_name:           (r.appointed_by as string | null)
        ? (appointedMap[r.appointed_by as string] ?? null)
        : null,
    })
  );

  // Profiles for appointment modal user select
  const { data: profilesRaw } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");

  const profiles: ProfileOption[] = (profilesRaw ?? []).map(
    (p: Record<string, unknown>) => ({
      id:        p.id as string,
      full_name: p.full_name as string | null,
      email:     p.email as string,
    })
  );

  const initialTab =
    searchParams.tab === "responsible" ? "responsible" : "documents";

  return (
    <AmlDocumentsPage
      documents={documents}
      responsiblePersons={responsiblePersons}
      profiles={profiles}
      canManage={canManage}
      initialTab={initialTab}
    />
  );
}
