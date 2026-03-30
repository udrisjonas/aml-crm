/**
 * TypeScript interfaces for all database tables.
 * These are hand-written from migrations — update when schema changes.
 */

// ── RBAC ──────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_by: string | null;
  created_at: string;
  accepted_at: string | null;
  last_sent_at?: string | null;
}

// ── Company ───────────────────────────────────────────────────────────────────

export interface CompanySettings {
  id: string;
  tenant_id: string;
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  tenant_type: string | null;
  vat_number: string | null;
  created_at: string;
  updated_at: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  monthly_fee: number;
  included_clients: number;
  is_active: boolean;
  created_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  status: "trial" | "active" | "cancelled" | "locked";
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface BillingEvent {
  id: string;
  tenant_id: string;
  client_id: string | null;
  event_type: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  description: string | null;
  created_at: string;
}

// ── Clients ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  tenant_id: string;
  client_type: "individual" | "legal_entity";
  assigned_broker_id: string | null;
  kyc_status:
    | "draft"
    | "sent_to_client"
    | "client_completed"
    | "broker_verified_originals"
    | "submitted"
    | "under_review"
    | "edd_triggered"
    | "edd_sent"
    | "edd_completed"
    | "escalated"
    | "verified"
    | "rejected";
  edd_status:
    | "not_required"
    | "triggered"
    | "sent_to_client"
    | "client_completed"
    | "under_review"
    | "completed";
  risk_rating: "low" | "medium" | "high" | "not_assessed";
  client_status: "active" | "pending_review" | "edd" | "archived" | "rejected";
  is_represented: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  notes: string | null;
}

export interface IndividualDetails {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  personal_id_number: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  pep_status: "yes" | "no" | "unknown";
  pep_self_declared: boolean;
  pep_details: string | null;
  sanctions_status: "clear" | "hit" | "unknown";
  adverse_media_status: "clear" | "hit" | "unknown";
  source_of_funds: string | null;
  source_of_wealth: string | null;
  occupation: string | null;
  purpose_of_relationship: string | null;
  id_document_type: "passport" | "national_id" | "residence_permit" | "eu_driving_license" | null;
  id_document_number: string | null;
  id_document_expiry: string | null;
  id_verified: boolean;
  id_verified_at: string | null;
  id_verified_by: string | null;
  liveness_checked: boolean;
  liveness_checked_at: string | null;
  // Extended fields
  is_lithuanian_resident: boolean;
  foreign_id_number: string | null;
  is_stateless: boolean;
  id_issuing_country: string | null;
  id_issue_date: string | null;
  residential_address: string | null;
  correspondence_address: string | null;
  phone: string | null;
  email: string | null;
  acting_on_own_behalf: boolean;
  beneficial_owner_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRepresentative {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  personal_id_number: string | null;
  nationality: string | null;
  relationship_type: "parent" | "guardian" | "poa_holder" | "court_appointed";
  pep_status: "yes" | "no" | "unknown";
  sanctions_status: "clear" | "hit" | "unknown";
  id_verified: boolean;
  id_verified_at: string | null;
  id_verified_by: string | null;
  liveness_checked: boolean;
  liveness_checked_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  tenant_id: string;
  uploaded_by: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_by_type: "broker" | "client" | "aml_officer" | "system";
  created_at: string;
}

export interface ClientKycToken {
  id: string;
  client_id: string;
  token: string;
  token_type: "kyc" | "edd";
  language: "lt" | "en";
  expires_at: string;
  used_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ClientFieldChange {
  id: string;
  client_id: string;
  token_id: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_type: "broker" | "client" | "aml_officer" | "system";
  changed_by: string | null;
  changed_at: string;
}

export interface ClientKycSignature {
  id: string;
  client_id: string;
  token_id: string;
  signed_by_name: string;
  signed_at: string;
  ip_address: string | null;
  is_representative: boolean;
  representative_id: string | null;
  declaration_text: string;
  created_at: string;
}

export interface ClientOriginalsVerified {
  id: string;
  client_id: string;
  verified_by: string;
  verified_at: string;
  notes: string | null;
}

// ── Compliance documents ───────────────────────────────────────────────────────

export interface ComplianceDocument {
  id: string;
  tenant_id: string;
  document_type: string;
  title: string;
  description: string | null;
  version: string;
  version_number: number;
  status: "draft" | "active" | "superseded";
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  approval_date: string | null;
  approved_by_name: string | null;
  next_review_date: string | null;
  changelog: string | null;
  superseded_at: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponsiblePerson {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  position: string;
  appointment_date: string;
  appointment_document_path: string | null;
  appointment_document_name: string | null;
  regulator_contact_email: string | null;
  regulator_contact_phone: string | null;
  regulator_name: string;
  status: "active" | "terminated";
  termination_date: string | null;
  termination_reason: string | null;
  appointed_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationDismissal {
  id: string;
  user_id: string;
  notification_type: string;
  reference_id: string;
  dismissed_at: string;
}

// ── Questionnaire ─────────────────────────────────────────────────────────────

export interface QuestionnaireTemplate {
  id: string;
  tenant_type: string;
  applies_to: "individual" | "company";
  field_key: string;
  field_label_lt: string;
  field_label_en: string;
  field_type: "text" | "textarea" | "boolean" | "select" | "date" | "number" | "file";
  options_lt: unknown | null;
  options_en: unknown | null;
  maps_to_column: string | null;
  is_required: boolean;
  section: string;
  sort_order: number;
  created_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  client_id: string;
  template_id: string;
  field_key: string;
  response_value: string | null;
  responded_at: string;
  responded_by: string | null;
  responded_by_type: "staff" | "client" | "system";
  created_at: string;
}

export interface RiskRule {
  id: string;
  tenant_type: string;
  applies_to: "individual" | "company";
  field_key: string;
  condition_type: "equals" | "not_equals" | "is_true" | "is_false" | "contains" | "gte" | "lte" | "not_null";
  condition_value: string | null;
  points: number;
  is_override: boolean;
  override_rating: "low" | "medium" | "high" | "critical" | null;
  description_lt: string | null;
  description_en: string | null;
  created_at: string;
}

export interface TenantTypeDefault {
  id: string;
  tenant_type: string;
  setting_key: string;
  setting_value: unknown;
  created_at: string;
}

export interface PeriodicReviewSchedule {
  id: string;
  client_id: string;
  tenant_id: string;
  due_date: string;
  next_review_due?: string; // alias used in some queries
  review_type: "periodic" | "triggered" | "initial";
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  message: string;
  responded_at: string | null;
  created_at: string;
}

// ── Shared join helpers ───────────────────────────────────────────────────────

/** Shape returned by Supabase when joining user_roles → roles(name) */
export interface UserRoleWithName {
  roles: { name: string } | null;
}

/**
 * Safely extracts a role name from a Supabase user_roles join result.
 * Replaces the repeated `(r as unknown as { roles: { name: string } }).roles?.name` pattern.
 */
export function extractRoleName(r: unknown): string {
  const row = r as { roles?: { name?: string } | null };
  return row.roles?.name ?? "";
}
