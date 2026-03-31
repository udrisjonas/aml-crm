"use client";

import { useState, useTransition, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateKycStatusAction,
  updateRiskRatingAction,
  updateIndividualDetailsAction,
  updateVerificationStatusAction,
  verifyOriginalsAction,
  recordDocumentAction,
  deleteDocumentAction,
  getDocumentSignedUrlAction,
  generateKycTokenAction,
  invalidateKycTokenAction,
  type IndividualDetailsUpdate,
} from "@/app/actions/clients";
import {
  terminateClientAction,
  approveRevivalAction,
  rejectRevivalAction,
} from "@/app/actions/termination";
import type { RelationshipOption } from "@/app/(app)/clients/new/page";
import { validateLithuanianPersonalCode } from "@/lib/validation/lithuanianPersonalCode";
import EddTab from "./EddTab";
import { useRoles } from "@/context/RolesContext";

// alias for saving email in the send-to-client modal
const saveEmailAction = updateIndividualDetailsAction;

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndividualDetails {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  personal_id_number: string | null;
  foreign_id_number: string | null;
  is_lithuanian_resident: boolean;
  nationality: string | null;
  is_stateless: boolean;
  id_issuing_country: string | null;
  country_of_residence: string | null;
  residential_address: string | null;
  correspondence_address: string | null;
  phone: string | null;
  email: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_issue_date: string | null;
  id_document_expiry: string | null;
  id_verified: boolean;
  id_verified_at: string | null;
  liveness_checked: boolean;
  liveness_checked_at: string | null;
  pep_status: string;
  pep_self_declared: boolean;
  pep_details: string | null;
  sanctions_status: string;
  adverse_media_status: string;
  acting_on_own_behalf: boolean;
  beneficial_owner_info: string | null;
  occupation: string | null;
  source_of_funds: string | null;
  source_of_wealth: string | null;
  purpose_of_relationship: string | null;
  relationship_frequency: string | null;
  relationship_use: string | null;
}

interface Representative {
  id: string;
  first_name: string;
  last_name: string;
  personal_id_number: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  relationship_type: string;
  pep_status: string;
  sanctions_status: string;
  id_verified: boolean;
  liveness_checked: boolean;
  notes: string | null;
  created_at: string;
}

interface OriginalsVerified {
  id: string;
  verified_by: string;
  verified_at: string;
  notes: string | null;
  verifier: { full_name: string | null } | null;
}

interface PendingRevival {
  id: string;
  status: string;
  revival_justification: string | null;
  revived_by: string;
  created_at: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
}

interface ClientData {
  id: string;
  client_type: string;
  kyc_status: string;
  edd_status: string;
  risk_rating: string;
  client_status: string;
  is_represented: boolean;
  created_at: string;
  updated_at: string;
  notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  termination_reason: string | null;
  termination_notes: string | null;
  termination_category: string | null;
  revival_requires_aml_review: boolean;
  individual_details: IndividualDetails | null;
  broker: { id: string; full_name: string | null; email: string } | null;
  client_representatives: Representative[];
  client_originals_verified: OriginalsVerified[];
}

interface DocumentRecord {
  id: string;
  client_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_by_type: string;
  created_at: string;
  uploader: { full_name: string | null } | null;
}

interface FieldChange {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_type: string;
  changed_at: string;
}

interface EddQuestionnaire {
  id: string;
  status: string;
  triggered_reason: string | null;
  sent_at: string | null;
  client_completed_at: string | null;
  aml_officer_reviewed_at: string | null;
  aml_officer_notes: string | null;
  aml_officer_recommendation: string | null;
  senior_manager_reviewed_at: string | null;
  senior_manager_notes: string | null;
  senior_manager_decision: string | null;
  created_at: string;
  updated_at: string;
}

interface EddResponse {
  id: string;
  question_key: string;
  answer: string | null;
}

interface EddDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  request_id: string | null;
  review_status: string | null;
  review_notes: string | null;
  review_rejection_reason: string | null;
  reviewed_at: string | null;
  reviewer: { full_name: string | null } | null;
}

interface EddDocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

interface ActiveToken {
  id: string;
  token: string;
  language: string;
  created_at: string;
  expires_at: string;
}

type Tab = "overview" | "kyc" | "documents" | "risk" | "audit" | "edd";

// ── Constants ─────────────────────────────────────────────────────────────────

const KYC_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft:                     { label: "Draft",              cls: "bg-slate-100 text-slate-500" },
  sent_to_client:            { label: "Sent to client",     cls: "bg-blue-100 text-blue-700" },
  client_completed:          { label: "Client done",        cls: "bg-violet-100 text-violet-700" },
  broker_verified_originals: { label: "Originals verified", cls: "bg-violet-100 text-violet-700" },
  submitted:                 { label: "Submitted",          cls: "bg-blue-100 text-blue-700" },
  under_review:              { label: "Under review",       cls: "bg-amber-100 text-amber-700" },
  edd_triggered:             { label: "EDD triggered",      cls: "bg-orange-100 text-orange-700" },
  edd_sent:                  { label: "EDD sent",           cls: "bg-orange-100 text-orange-700" },
  edd_completed:             { label: "EDD completed",      cls: "bg-violet-100 text-violet-700" },
  escalated:                 { label: "Escalated",          cls: "bg-red-100 text-red-700" },
  verified:                  { label: "Verified",           cls: "bg-emerald-100 text-emerald-700" },
  rejected:                  { label: "Rejected",           cls: "bg-red-100 text-red-700" },
};

const RISK_BADGES: Record<string, { label: string; cls: string }> = {
  low:          { label: "Low risk",      cls: "bg-emerald-100 text-emerald-700" },
  medium:       { label: "Medium risk",   cls: "bg-amber-100 text-amber-700" },
  high:         { label: "High risk",     cls: "bg-red-100 text-red-700" },
  not_assessed: { label: "Not assessed",  cls: "bg-slate-100 text-slate-500" },
};

const PEP_BADGES: Record<string, { label: string; cls: string }> = {
  yes:     { label: "PEP",         cls: "bg-red-100 text-red-700" },
  no:      { label: "Not a PEP",   cls: "bg-emerald-100 text-emerald-700" },
  unknown: { label: "PEP unknown", cls: "bg-slate-100 text-slate-500" },
};

const SCREEN_BADGES: Record<string, { label: string; cls: string }> = {
  clear:   { label: "Clear",   cls: "bg-emerald-100 text-emerald-700" },
  hit:     { label: "Hit",     cls: "bg-red-100 text-red-700" },
  unknown: { label: "Unknown", cls: "bg-slate-100 text-slate-500" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  photo: "Photo", passport: "Passport", national_id: "National ID",
  residence_permit: "Residence permit", proof_of_address: "Proof of address",
  poa_document: "Power of attorney", birth_certificate: "Birth certificate",
  court_order: "Court order", other_representation: "Other representation",
  company_registration: "Company registration", company_accounts: "Company accounts",
  pep_check_screenshot: "PEP check", sanctions_check_screenshot: "Sanctions check",
  adverse_media_screenshot: "Adverse media", edd_document: "EDD document", other: "Other",
};

const REL_LABELS: Record<string, string> = {
  parent: "Parent", guardian: "Guardian",
  poa_holder: "Power of attorney", court_appointed: "Court-appointed",
};

const ALL_KYC_STATUSES = Object.entries(KYC_STATUS_BADGES).map(([value, { label }]) => ({ value, label }));

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined, mode: "date" | "datetime" = "date") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    ...(mode === "datetime" ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null | boolean }) {
  const display = value === null || value === undefined || value === ""
    ? <span className="text-slate-400">—</span>
    : typeof value === "boolean"
      ? <span className={value ? "text-emerald-600 font-medium" : "text-slate-500"}>
          {value ? "Yes" : "No"}
        </span>
      : <span className="text-slate-800">{value}</span>;
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-right">{display}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

// ── Send to client modal ──────────────────────────────────────────────────────

function SendToClientModal({
  client,
  onClose,
  onSent,
}: {
  client: ClientData;
  onClose: () => void;
  onSent: (url: string, emailSent: boolean) => void;
}) {
  const router = useRouter();
  const d = client.individual_details;
  const existingEmail = d?.email ?? "";

  // Step 1: if no email, ask for one; step 2: confirm + language
  const [step, setStep] = useState<"email" | "confirm">(existingEmail ? "confirm" : "email");
  const [emailInput, setEmailInput] = useState(existingEmail);
  const [language, setLanguage] = useState<"lt" | "en">("lt");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const detailsId = d?.id;

  function handleSaveEmail() {
    if (!emailInput.trim()) { setError("Please enter an email address."); return; }
    setError("");
    startTransition(async () => {
      if (!detailsId) { setError("Client has no details record."); return; }
      const res = await saveEmailAction(detailsId, client.id, { email: emailInput.trim() });
      if (res?.error) { setError(res.error); return; }
      router.refresh();
      setStep("confirm");
    });
  }

  function handleSend() {
    setError("");
    const email = emailInput.trim() || existingEmail;
    startTransition(async () => {
      const res = await generateKycTokenAction(client.id, language, email);
      if (res?.error && !res.url) { setError(res.error); return; }
      router.refresh();
      onSent(res.url!, res.emailSent ?? false);
    });
  }

  const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {step === "email" ? "Enter client email" : "Send KYC link"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {step === "email" ? (
            <>
              <p className="text-sm text-slate-600">
                This client has no email address on file. Enter one to proceed.
              </p>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Client email address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
                  autoFocus
                  placeholder="client@example.com"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEmail}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
                >
                  {isPending ? "Saving…" : "Save & continue"}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span className="text-slate-800 font-medium">
                    {d ? `${d.first_name} ${d.last_name}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-800">{emailInput || existingEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Link expires</span>
                  <span className="text-amber-700 font-medium">{expiryDate}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-2">Form language</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden w-fit">
                  {(["lt", "en"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-5 py-2 text-sm font-medium transition-colors ${
                        language === lang ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lang === "lt" ? "Lithuanian" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSend}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition"
                >
                  {isPending ? "Sending…" : "Send email"}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Send result modal (copy link) ─────────────────────────────────────────────

function SendResultModal({
  url,
  emailSent,
  clientEmail,
  onClose,
}: {
  url: string;
  emailSent: boolean;
  clientEmail: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">KYC link ready</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {emailSent ? (
            <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-800 font-medium">
                Email sent to <span className="font-semibold">{clientEmail}</span>
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                Email could not be sent. Share the link below manually via WhatsApp, Telegram, or email.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">KYC link (valid 48 hours)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status dropdown ───────────────────────────────────────────────────────────

function StatusDropdown({
  clientId, currentStatus, onDone,
}: { clientId: string; currentStatus: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function pick(status: string) {
    setOpen(false);
    startTransition(async () => {
      await updateKycStatusAction(clientId, status);
      onDone();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="px-3.5 py-2 text-sm font-medium text-slate-700 border border-slate-300
          rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5
          disabled:opacity-50"
      >
        {isPending ? "Updating…" : "Change status"}
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg
          border border-slate-200 py-1 z-20 max-h-72 overflow-y-auto">
          {ALL_KYC_STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => pick(value)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors
                ${value === currentStatus
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Termination labels ────────────────────────────────────────────────────────

const TERMINATION_REASONS: { value: string; label: string; isAml: boolean }[] = [
  { value: "relationship_completed",      label: "Relationship completed",              isAml: false },
  { value: "client_request",              label: "Client request",                      isAml: false },
  { value: "no_longer_requires_services", label: "No longer requires services",         isAml: false },
  { value: "cdd_not_completed",           label: "CDD not completed",                   isAml: true  },
  { value: "suspicious_activity",         label: "Suspicious activity",                 isAml: true  },
  { value: "sanctions_pep_concerns",      label: "Sanctions / PEP concerns",            isAml: true  },
  { value: "refused_information",         label: "Refused to provide information",      isAml: true  },
  { value: "other_aml_reason",            label: "Other AML reason",                    isAml: true  },
];

const TERMINATION_REASON_LABELS: Record<string, string> = Object.fromEntries(
  TERMINATION_REASONS.map((r) => [r.value, r.label])
);

// ── TerminationModal ──────────────────────────────────────────────────────────

function TerminationModal({
  clientId,
  onClose,
  onDone,
}: {
  clientId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes]   = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState("");

  const selectedReason = TERMINATION_REASONS.find((r) => r.value === reason);
  const isAml = selectedReason?.isAml ?? false;
  const notesRequired = isAml;

  function handleConfirm() {
    if (!reason) { setError("Please select a termination reason."); return; }
    if (notesRequired && !notes.trim()) { setError("Notes are required for AML termination reasons."); return; }
    setError("");
    startTransition(async () => {
      const res = await terminateClientAction(clientId, reason, notes);
      if (!res.ok) { setError(res.error ?? "Unknown error"); return; }
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Archive client</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Termination reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={selectCls}
            >
              <option value="">— Select reason —</option>
              <optgroup label="Normal">
                {TERMINATION_REASONS.filter((r) => !r.isAml).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </optgroup>
              <optgroup label="AML / Compliance">
                {TERMINATION_REASONS.filter((r) => r.isAml).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {isAml && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">AML termination</p>
                <p className="text-sm text-red-700 mt-0.5">
                  This client will be flagged as AML-terminated. Revival will require AML officer review.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Notes {notesRequired ? <span className="text-red-500">*</span> : <span className="text-slate-400">(optional)</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls + " resize-none"}
              placeholder={isAml ? "Document the reason for AML termination…" : "Any additional context…"}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition"
            >
              {isPending ? "Archiving…" : "Archive client"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RevivalModal (AML) ────────────────────────────────────────────────────────

function AmlRevivalModal({
  revivalId,
  onClose,
  onDone,
}: {
  revivalId: string;
  onClose: () => void;
  onDone: (newClientId: string) => void;
}) {
  const [action, setAction]   = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes]     = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError]     = useState("");

  function handleApprove() {
    setAction("approve");
    startTransition(async () => {
      const res = await approveRevivalAction(revivalId);
      if (!res.ok) { setError(res.error ?? "Unknown error"); setAction(null); return; }
      onDone(res.newClientId!);
    });
  }

  function handleReject() {
    if (!notes.trim()) { setError("Please provide rejection notes."); return; }
    setAction("reject");
    startTransition(async () => {
      const res = await rejectRevivalAction(revivalId, notes);
      if (!res.ok) { setError(res.error ?? "Unknown error"); setAction(null); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Review revival request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Reviewer notes (required for rejection)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls + " resize-none"}
              placeholder="Notes for the requestor…"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition"
            >
              {isPending && action === "approve" ? "Approving…" : "Approve & create new client"}
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition"
            >
              {isPending && action === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Overview tab
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ client }: { client: ClientData }) {
  const d = client.individual_details;
  if (!d) return <p className="text-slate-500 text-sm">No details found.</p>;

  const kycBadge = KYC_STATUS_BADGES[client.kyc_status] ?? KYC_STATUS_BADGES.draft;
  const riskBadge = RISK_BADGES[client.risk_rating] ?? RISK_BADGES.not_assessed;
  const pepBadge = PEP_BADGES[d.pep_status] ?? PEP_BADGES.unknown;
  const sanctionsBadge = SCREEN_BADGES[d.sanctions_status] ?? SCREEN_BADGES.unknown;
  const mediaBadge = SCREEN_BADGES[d.adverse_media_status] ?? SCREEN_BADGES.unknown;

  const rep = client.client_representatives[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Left — key details */}
        <Card title="Personal details">
          <InfoRow label="Full name" value={`${d.first_name} ${d.last_name}`} />
          {d.is_lithuanian_resident
            ? <InfoRow label="Personal ID" value={d.personal_id_number} />
            : <>
                <InfoRow label="Date of birth" value={d.date_of_birth ? fmt(d.date_of_birth) : null} />
                <InfoRow label="Foreign ID" value={d.foreign_id_number} />
              </>
          }
          <InfoRow label="Nationality" value={d.nationality} />
          <InfoRow label="Country of residence" value={d.country_of_residence} />
          <InfoRow label="Address" value={d.residential_address} />
          <InfoRow label="Phone" value={d.phone} />
          <InfoRow label="Email" value={d.email} />
        </Card>

        {/* Right — compliance status */}
        <Card title="Compliance status">
          <div className="py-2.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">KYC status</span>
            <Badge cls={kycBadge.cls}>{kycBadge.label}</Badge>
          </div>
          <div className="py-2.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">Risk rating</span>
            <Badge cls={riskBadge.cls}>{riskBadge.label}</Badge>
          </div>
          <div className="py-2.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">PEP status</span>
            <Badge cls={pepBadge.cls}>{pepBadge.label}</Badge>
          </div>
          <div className="py-2.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">Sanctions</span>
            <Badge cls={sanctionsBadge.cls}>{sanctionsBadge.label}</Badge>
          </div>
          <div className="py-2.5 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">Adverse media</span>
            <Badge cls={mediaBadge.cls}>{mediaBadge.label}</Badge>
          </div>
          <InfoRow label="Acting on own behalf" value={d.acting_on_own_behalf} />
          <InfoRow label="ID verified" value={d.id_verified} />
          <InfoRow label="Liveness checked" value={d.liveness_checked} />
        </Card>
      </div>

      {/* Representation */}
      {client.is_represented && (
        <Card title="Representative">
          {rep ? (
            <>
              <InfoRow label="Name" value={`${rep.first_name} ${rep.last_name}`} />
              <InfoRow label="Relationship" value={REL_LABELS[rep.relationship_type] ?? rep.relationship_type} />
              <InfoRow label="Personal ID" value={rep.personal_id_number} />
              <InfoRow label="Nationality" value={rep.nationality} />
              <InfoRow label="PEP status" value={PEP_BADGES[rep.pep_status]?.label ?? rep.pep_status} />
              <InfoRow label="ID verified" value={rep.id_verified} />
              {rep.notes && <InfoRow label="Notes" value={rep.notes} />}
            </>
          ) : (
            <p className="py-3 text-sm text-slate-400">No representative record found.</p>
          )}
        </Card>
      )}

      {/* UBO */}
      {!d.acting_on_own_behalf && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">UBO questionnaire required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This client is acting on behalf of another person.
              {d.beneficial_owner_info && ` Declared beneficial owner: ${d.beneficial_owner_info}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KYC Details tab
// ══════════════════════════════════════════════════════════════════════════════

// Extracted outside KycDetailsTab so React sees a stable component identity
// across re-renders — prevents focus loss on every keystroke.
const KycField = memo(function KycField({
  label,
  value,
  onChange,
  type = "text",
  isEditing,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  type?: string;
  isEditing: boolean;
}) {
  if (!isEditing) {
    return (
      <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
        <span className="text-sm text-slate-500 shrink-0">{label}</span>
        <span className="text-sm text-slate-800 text-right">
          {value || <span className="text-slate-400">—</span>}
        </span>
      </div>
    );
  }
  return (
    <div className="py-2">
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input type={type} className={inputCls} value={value} onChange={onChange} />
    </div>
  );
});

function KycDetailsTab({
  client,
  purposeOptions,
  frequencyOptions,
  useOptions,
}: {
  client: ClientData;
  purposeOptions: RelationshipOption[];
  frequencyOptions: RelationshipOption[];
  useOptions: RelationshipOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [verifyPending, startVerifyTransition] = useTransition();
  const [verifyNotes, setVerifyNotes] = useState("");
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);

  const d = client.individual_details;
  const originals = client.client_originals_verified[0] ?? null;

  const [form, setForm] = useState<IndividualDetailsUpdate>({
    first_name: d?.first_name ?? "",
    last_name: d?.last_name ?? "",
    date_of_birth: d?.date_of_birth ?? null,
    personal_id_number: d?.personal_id_number ?? null,
    foreign_id_number: d?.foreign_id_number ?? null,
    is_lithuanian_resident: d?.is_lithuanian_resident ?? true,
    nationality: d?.nationality ?? null,
    is_stateless: d?.is_stateless ?? false,
    id_issuing_country: d?.id_issuing_country ?? null,
    country_of_residence: d?.country_of_residence ?? null,
    residential_address: d?.residential_address ?? null,
    correspondence_address: d?.correspondence_address ?? null,
    id_document_type: d?.id_document_type ?? null,
    id_document_number: d?.id_document_number ?? null,
    id_issue_date: d?.id_issue_date ?? null,
    id_document_expiry: d?.id_document_expiry ?? null,
    phone: d?.phone ?? null,
    email: d?.email ?? null,
    acting_on_own_behalf: d?.acting_on_own_behalf ?? true,
    beneficial_owner_info: d?.beneficial_owner_info ?? null,
    occupation: d?.occupation ?? null,
    source_of_funds: d?.source_of_funds ?? null,
    source_of_wealth: d?.source_of_wealth ?? null,
    purpose_of_relationship: d?.purpose_of_relationship ?? null,
    relationship_frequency: d?.relationship_frequency ?? null,
    relationship_use: d?.relationship_use ?? null,
    pep_status: d?.pep_status ?? "unknown",
    pep_self_declared: d?.pep_self_declared ?? false,
    pep_details: d?.pep_details ?? null,
  });

  // Verification state (saved separately)
  const [verif, setVerif] = useState({
    id_verified: d?.id_verified ?? false,
    liveness_checked: d?.liveness_checked ?? false,
    sanctions_status: d?.sanctions_status ?? "unknown",
    adverse_media_status: d?.adverse_media_status ?? "unknown",
    pep_status: d?.pep_status ?? "unknown",
  });
  const [verifPending, startVerifTransition] = useTransition();
  const [verifError, setVerifError] = useState("");
  const [personalCodeValid, setPersonalCodeValid] = useState<boolean | null>(null);
  const [personalCodeError, setPersonalCodeError] = useState("");
  const [issueDateError, setIssueDateError] = useState("");
  const [expiryDateError, setExpiryDateError] = useState("");

  if (!d) return <p className="text-sm text-slate-400">No details on record.</p>;

  function setF<K extends keyof IndividualDetailsUpdate>(k: K, v: IndividualDetailsUpdate[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function txt(k: keyof IndividualDetailsUpdate) {
    return {
      value: (form[k] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setF(k, e.target.value as never),
    };
  }

  function handlePersonalCodeBlur(code: string) {
    if (!code) { setPersonalCodeValid(null); setPersonalCodeError(""); return; }
    const result = validateLithuanianPersonalCode(code);
    setPersonalCodeValid(result.valid);
    setPersonalCodeError(result.errorEn ?? "");
    if (result.valid && result.dateOfBirth) {
      setF("date_of_birth", result.dateOfBirth);
    }
  }

  function handleIssueDateBlur() {
    const issue = form.id_issue_date;
    const dob = form.date_of_birth;
    if (!issue) { setIssueDateError(""); return; }
    if (dob && issue < dob) {
      setIssueDateError("Issue date cannot be before date of birth");
      return;
    }
    setIssueDateError("");
  }

  function handleExpiryDateBlur() {
    const expiry = form.id_document_expiry;
    const issue = form.id_issue_date;
    if (!expiry) { setExpiryDateError(""); return; }
    if (issue && expiry < issue) {
      setExpiryDateError("Expiry date cannot be before issue date");
      return;
    }
    setExpiryDateError("");
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const res = await updateIndividualDetailsAction(d!.id, client.id, form);
      if (res?.error) { setError(res.error); return; }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleSaveVerif() {
    setVerifError("");
    startVerifTransition(async () => {
      const res = await updateVerificationStatusAction(d!.id, client.id, verif);
      if (res?.error) setVerifError(res.error);
      else router.refresh();
    });
  }

  function handleVerifyOriginals() {
    startVerifyTransition(async () => {
      const res = await verifyOriginalsAction(client.id, verifyNotes || undefined);
      if (res?.error) setError(res.error);
      else { setShowVerifyConfirm(false); router.refresh(); }
    });
  }

  return (
    <div className="grid grid-cols-3 gap-6 items-start">
      {/* Main form — 2/3 width */}
      <div className="col-span-2 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* Edit toggle bar */}
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {/* Personal details */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Personal details</h3>
          </div>
          <div className="px-5 py-1">
            <KycField label="First name" isEditing={isEditing} {...txt("first_name")} />
            <KycField label="Last name" isEditing={isEditing} {...txt("last_name")} />
            {isEditing && (
              <div className="py-2">
                <label className="text-xs text-slate-500 mb-1 block">Resident type</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden w-fit">
                  {(["lt", "foreign"] as const).map((t) => {
                    const active = form.is_lithuanian_resident === (t === "lt");
                    return (
                      <button key={t} type="button"
                        onClick={() => setF("is_lithuanian_resident", t === "lt")}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${active ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {t === "lt" ? "LT resident" : "Foreign"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {form.is_lithuanian_resident ? (
              isEditing ? (
                <div className="py-2">
                  <label className="block text-xs text-slate-500 mb-1">Personal ID number</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={
                        personalCodeValid === true
                          ? inputCls.replace("border-slate-300", "border-emerald-500") + " pr-8"
                          : personalCodeValid === false
                          ? inputCls.replace("border-slate-300", "border-red-500") + " pr-8"
                          : inputCls
                      }
                      value={form.personal_id_number ?? ""}
                      onChange={(e) => setF("personal_id_number", e.target.value || null)}
                      onBlur={(e) => handlePersonalCodeBlur(e.target.value)}
                      maxLength={11}
                    />
                    {personalCodeValid === true && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {personalCodeValid === false && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {personalCodeError && <p className="text-xs text-red-600 mt-1">{personalCodeError}</p>}
                  {personalCodeValid && form.date_of_birth && (
                    <p className="text-xs text-emerald-600 mt-1">Date of birth auto-filled: {form.date_of_birth}</p>
                  )}
                </div>
              ) : (
                <KycField label="Personal ID number" isEditing={false} value={form.personal_id_number ?? ""} onChange={() => {}} />
              )
            ) : (
              <>
                <KycField label="Date of birth" type="date" isEditing={isEditing} {...txt("date_of_birth")} />
                <KycField label="Foreign ID number" isEditing={isEditing} {...txt("foreign_id_number")} />
              </>
            )}
            <KycField label="Nationality" isEditing={isEditing} {...txt("nationality")} />
            <KycField label="Country of residence" isEditing={isEditing} {...txt("country_of_residence")} />
            <KycField label="Residential address" isEditing={isEditing} {...txt("residential_address")} />
            <KycField label="Correspondence address" isEditing={isEditing} {...txt("correspondence_address")} />
            <KycField label="Phone" isEditing={isEditing} {...txt("phone")} />
            <KycField label="Email" type="email" isEditing={isEditing} {...txt("email")} />
          </div>
        </div>

        {/* ID document */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Identity document</h3>
          </div>
          <div className="px-5 py-1">
            {isEditing ? (
              <div className="py-2">
                <label className="text-xs text-slate-500 mb-1 block">Document type</label>
                <select className={selectCls} value={form.id_document_type ?? ""} onChange={(e) => setF("id_document_type", e.target.value || null)}>
                  <option value="">—</option>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID card</option>
                  <option value="residence_permit">Residence permit</option>
                </select>
              </div>
            ) : (
              <div className="flex justify-between py-2.5 border-b border-slate-100 gap-4">
                <span className="text-sm text-slate-500">Document type</span>
                <span className="text-sm text-slate-800">{form.id_document_type ? DOC_TYPE_LABELS[form.id_document_type] ?? form.id_document_type : "—"}</span>
              </div>
            )}
            <KycField label="Document number" isEditing={isEditing} {...txt("id_document_number")} />
            {isEditing ? (
              <div className="py-2">
                <label className="block text-xs text-slate-500 mb-1">Issue date</label>
                <input type="date"
                  className={issueDateError ? inputCls.replace("border-slate-300", "border-red-500") : inputCls}
                  value={form.id_issue_date ?? ""}
                  onChange={(e) => setF("id_issue_date", e.target.value || null)}
                  onBlur={handleIssueDateBlur} />
                {issueDateError && <p className="text-xs text-red-600 mt-1">{issueDateError}</p>}
              </div>
            ) : (
              <KycField label="Issue date" isEditing={false} value={form.id_issue_date ?? ""} onChange={() => {}} />
            )}
            {isEditing ? (
              <div className="py-2">
                <label className="block text-xs text-slate-500 mb-1">Expiry date</label>
                <input type="date"
                  className={expiryDateError ? inputCls.replace("border-slate-300", "border-red-500") : inputCls}
                  value={form.id_document_expiry ?? ""}
                  onChange={(e) => setF("id_document_expiry", e.target.value || null)}
                  onBlur={handleExpiryDateBlur} />
                {expiryDateError && <p className="text-xs text-red-600 mt-1">{expiryDateError}</p>}
              </div>
            ) : (
              <KycField label="Expiry date" isEditing={false} value={form.id_document_expiry ?? ""} onChange={() => {}} />
            )}
            <KycField label="Issuing country" isEditing={isEditing} {...txt("id_issuing_country")} />
          </div>
        </div>

        {/* Occupation & purpose */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Occupation & purpose</h3>
          </div>
          <div className="px-5 py-1">
            {/* Purpose of relationship — dropdown from templates */}
            {isEditing ? (
              <div className="py-2">
                <label className="block text-xs text-slate-500 mb-1">Purpose of relationship</label>
                <select className={selectCls} value={form.purpose_of_relationship ?? ""}
                  onChange={(e) => setF("purpose_of_relationship", e.target.value || null)}>
                  <option value="">— Select —</option>
                  {purposeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label_en}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
                <span className="text-sm text-slate-500 shrink-0">Purpose of relationship</span>
                <span className="text-sm text-slate-800 text-right">
                  {purposeOptions.find((o) => o.value === form.purpose_of_relationship)?.label_en
                    || form.purpose_of_relationship
                    || <span className="text-slate-400">—</span>}
                </span>
              </div>
            )}
            {/* Transaction frequency */}
            {frequencyOptions.length > 0 && (isEditing ? (
              <div className="py-2">
                <label className="block text-xs text-slate-500 mb-1">Transaction frequency</label>
                <select className={selectCls} value={form.relationship_frequency ?? ""}
                  onChange={(e) => setF("relationship_frequency", e.target.value || null)}>
                  <option value="">— Select —</option>
                  {frequencyOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label_en}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
                <span className="text-sm text-slate-500 shrink-0">Transaction frequency</span>
                <span className="text-sm text-slate-800 text-right">
                  {frequencyOptions.find((o) => o.value === form.relationship_frequency)?.label_en
                    || form.relationship_frequency
                    || <span className="text-slate-400">—</span>}
                </span>
              </div>
            ))}
            {/* Purpose of use */}
            {useOptions.length > 0 && (isEditing ? (
              <div className="py-2">
                <label className="block text-xs text-slate-500 mb-1">Purpose of use</label>
                <select className={selectCls} value={form.relationship_use ?? ""}
                  onChange={(e) => setF("relationship_use", e.target.value || null)}>
                  <option value="">— Select —</option>
                  {useOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label_en}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
                <span className="text-sm text-slate-500 shrink-0">Purpose of use</span>
                <span className="text-sm text-slate-800 text-right">
                  {useOptions.find((o) => o.value === form.relationship_use)?.label_en
                    || form.relationship_use
                    || <span className="text-slate-400">—</span>}
                </span>
              </div>
            ))}
            <KycField label="Acting on own behalf" isEditing={isEditing} {...txt("acting_on_own_behalf")} />
            {!form.acting_on_own_behalf && <KycField label="Beneficial owner info" isEditing={isEditing} {...txt("beneficial_owner_info")} />}
          </div>
        </div>

        {/* PEP */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">PEP declaration</h3>
          </div>
          <div className="px-5 py-1">
            {isEditing ? (
              <div className="py-2">
                <label className="text-xs text-slate-500 mb-1 block">PEP status</label>
                <select className={selectCls} value={form.pep_status ?? "unknown"} onChange={(e) => setF("pep_status", e.target.value)}>
                  <option value="unknown">Not assessed</option>
                  <option value="no">No — not a PEP</option>
                  <option value="yes">Yes — PEP</option>
                </select>
              </div>
            ) : (
              <div className="flex justify-between py-2.5 border-b border-slate-100 gap-4">
                <span className="text-sm text-slate-500">PEP status</span>
                <Badge cls={PEP_BADGES[form.pep_status ?? "unknown"]?.cls ?? "bg-slate-100 text-slate-500"}>
                  {PEP_BADGES[form.pep_status ?? "unknown"]?.label ?? "Unknown"}
                </Badge>
              </div>
            )}
            <KycField label="Self-declared" isEditing={isEditing} {...txt("pep_self_declared")} />
            {(form.pep_status === "yes") && <KycField label="PEP details" isEditing={isEditing} {...txt("pep_details")} />}
          </div>
        </div>

        {/* Broker verified originals */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Original document verification</h3>
          </div>
          <div className="p-5">
            {originals ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Originals verified in person</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by {originals.verifier?.full_name ?? "broker"} · {fmt(originals.verified_at, "datetime")}
                  </p>
                  {originals.notes && <p className="text-xs text-slate-500 mt-1">{originals.notes}</p>}
                  <p className="text-xs text-slate-400 mt-1">This record is permanent and cannot be removed.</p>
                </div>
              </div>
            ) : showVerifyConfirm ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">
                  Confirm that you have physically verified the original documents in person.
                  This action is permanent and cannot be undone.
                </p>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Optional notes (e.g. branch location, reference number)…"
                  rows={2}
                  className={inputCls + " resize-none"}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyOriginals}
                    disabled={verifyPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
                  >
                    {verifyPending ? "Recording…" : "Confirm verification"}
                  </button>
                  <button
                    onClick={() => setShowVerifyConfirm(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex-1">
                  <p className="text-sm font-medium text-amber-800">Original documents not yet verified</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Verify the client&apos;s original ID documents in person before submitting the KYC file.
                  </p>
                </div>
                <button
                  onClick={() => setShowVerifyConfirm(true)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shrink-0"
                >
                  Mark as verified
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification panel — 1/3 width */}
      <div className="space-y-4 sticky top-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Verification status</h3>
          </div>
          <div className="p-5 space-y-4">
            {verifError && (
              <p className="text-xs text-red-600">{verifError}</p>
            )}

            {/* ID verified */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-blue-600"
                checked={verif.id_verified}
                onChange={(e) => setVerif((v) => ({ ...v, id_verified: e.target.checked }))}
              />
              <div>
                <span className="text-sm font-medium text-slate-700">ID document verified</span>
                {d.id_verified && d.id_verified_at && (
                  <p className="text-xs text-slate-400">{fmt(d.id_verified_at, "datetime")}</p>
                )}
              </div>
            </label>

            {/* Liveness checked */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-blue-600"
                checked={verif.liveness_checked}
                onChange={(e) => setVerif((v) => ({ ...v, liveness_checked: e.target.checked }))}
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Liveness check completed</span>
                {d.liveness_checked && d.liveness_checked_at && (
                  <p className="text-xs text-slate-400">{fmt(d.liveness_checked_at, "datetime")}</p>
                )}
              </div>
            </label>

            {/* Sanctions */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Sanctions screening</label>
              <select className={selectCls} value={verif.sanctions_status}
                onChange={(e) => setVerif((v) => ({ ...v, sanctions_status: e.target.value }))}>
                <option value="unknown">Unknown</option>
                <option value="clear">Clear</option>
                <option value="hit">Hit</option>
              </select>
            </div>

            {/* Adverse media */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Adverse media</label>
              <select className={selectCls} value={verif.adverse_media_status}
                onChange={(e) => setVerif((v) => ({ ...v, adverse_media_status: e.target.value }))}>
                <option value="unknown">Unknown</option>
                <option value="clear">Clear</option>
                <option value="hit">Hit</option>
              </select>
            </div>

            {/* PEP confirmation */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">PEP confirmed status</label>
              <select className={selectCls} value={verif.pep_status}
                onChange={(e) => setVerif((v) => ({ ...v, pep_status: e.target.value }))}>
                <option value="unknown">Not assessed</option>
                <option value="no">No — not a PEP</option>
                <option value="yes">Yes — PEP</option>
              </select>
            </div>

            <button
              onClick={handleSaveVerif}
              disabled={verifPending}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
            >
              {verifPending ? "Saving…" : "Save verification"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Documents tab
// ══════════════════════════════════════════════════════════════════════════════

function DocumentsTab({ client, documents }: { client: ClientData; documents: DocumentRecord[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
    setUploadError("");
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const path = `${client.id}/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .upload(path, selectedFile, { upsert: false });

      if (storageError) throw new Error(storageError.message);

      const res = await recordDocumentAction({
        client_id: client.id,
        document_type: docType,
        file_name: selectedFile.name,
        file_path: path,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || undefined,
      });

      if (res?.error) throw new Error(res.error);

      setShowUpload(false);
      setSelectedFile(null);
      setDocType("other");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(filePath: string) {
    const { url, error } = await getDocumentSignedUrlAction(filePath);
    if (url) window.open(url, "_blank");
    else alert(error ?? "Could not generate download link");
  }

  async function handleDelete(doc: DocumentRecord) {
    setDeletePending(doc.id);
    const res = await deleteDocumentAction(doc.id, doc.file_path, client.id);
    setDeletePending(null);
    setDeleteConfirm(null);
    if (!res?.error) router.refresh();
  }

  // Group by document type
  const grouped = documents.reduce<Record<string, DocumentRecord[]>>((acc, doc) => {
    const key = doc.document_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  function fmtSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Upload bar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {documents.length} document{documents.length !== 1 ? "s" : ""} on file
        </p>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          + Upload document
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Upload document</h3>
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Document type</label>
            <select className={selectCls} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">File</label>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3
                file:rounded-lg file:border file:border-slate-300 file:text-slate-700
                file:bg-white file:hover:bg-slate-50 file:transition-colors file:text-xs file:font-medium"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={() => { setShowUpload(false); setSelectedFile(null); }}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !showUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 text-sm font-medium">No documents uploaded yet</p>
          <p className="text-slate-400 text-xs mt-1">Upload ID documents, proof of address, and supporting files.</p>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([type, docs]) => (
        <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              {DOC_TYPE_LABELS[type] ?? type}
              <span className="ml-2 text-xs font-normal text-slate-400">{docs.length}</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <div key={doc.id} className="px-5 py-3.5 flex items-center gap-4">
                <svg className="w-8 h-8 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-400">
                    {fmt(doc.created_at)} · {doc.uploader?.full_name ?? doc.uploaded_by_type}
                    {doc.file_size && ` · ${fmtSize(doc.file_size)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(doc.file_path)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    Download
                  </button>
                  {deleteConfirm === doc.id ? (
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500">Delete?</span>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletePending === doc.id}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Yes
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-slate-400">No</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(doc.id)}
                      className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Risk Assessment tab
// ══════════════════════════════════════════════════════════════════════════════

function RiskTab({ client }: { client: ClientData }) {
  const router = useRouter();
  const [rating, setRating] = useState(client.risk_rating);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateRiskRatingAction(client.id, rating);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-amber-800">Risk assessment coming soon</p>
        <p className="text-sm text-amber-700 mt-1">
          A full risk scoring matrix with configurable factors will be built in a future module.
          For now, you can manually set the risk rating below.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Risk rating</h3>
        {(["not_assessed", "low", "medium", "high"] as const).map((r) => {
          const active = rating === r;
          const cls = { not_assessed: "border-slate-200", low: "border-emerald-300", medium: "border-amber-300", high: "border-red-300" }[r];
          return (
            <label key={r}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${active ? cls + " " + { not_assessed: "bg-slate-50", low: "bg-emerald-50", medium: "bg-amber-50", high: "bg-red-50" }[r] : "border-transparent hover:bg-slate-50"}`}
            >
              <input type="radio" className="accent-blue-600" checked={active} onChange={() => setRating(r)} />
              <span className="text-sm font-medium capitalize text-slate-800">
                {r === "not_assessed" ? "Not assessed" : r}
              </span>
            </label>
          );
        })}
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        <button
          onClick={handleSave}
          disabled={isPending || rating === client.risk_rating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition"
        >
          {isPending ? "Saving…" : "Save rating"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Audit Log tab
// ══════════════════════════════════════════════════════════════════════════════

const FIELD_LABELS: Record<string, string> = {
  kyc_status: "KYC status",
  edd_status: "EDD status",
  risk_rating: "Risk rating",
  client_status: "Client status",
  assigned_broker_id: "Assigned broker",
  is_represented: "Is represented",
  notes: "Notes",
  last_reviewed_by: "Last reviewed by",
};

function AuditTab({ fieldChanges }: { fieldChanges: FieldChange[] }) {
  if (fieldChanges.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500 text-sm font-medium">No changes recorded yet</p>
        <p className="text-slate-400 text-xs mt-1">
          Changes to KYC status, risk rating, and other key fields will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Field</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">From</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">To</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fieldChanges.map((ch) => {
            const isClient = ch.changed_by_type === "client";
            return (
              <tr key={ch.id} className={isClient ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"}>
                <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {fmt(ch.changed_at, "datetime")}
                </td>
                <td className="px-5 py-3 text-slate-700 font-medium">
                  {FIELD_LABELS[ch.field_name] ?? ch.field_name}
                </td>
                <td className="px-5 py-3 text-slate-400 max-w-[180px] truncate">
                  {ch.old_value || <span className="italic">empty</span>}
                </td>
                <td className="px-5 py-3 text-slate-700 max-w-[180px] truncate">
                  {ch.new_value || <span className="italic text-slate-400">empty</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    isClient
                      ? "bg-amber-200 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {ch.changed_by_type}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Root component
// ══════════════════════════════════════════════════════════════════════════════

const TABS_BASE: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "kyc",        label: "KYC Details" },
  { id: "documents",  label: "Documents" },
  { id: "risk",       label: "Risk Assessment" },
  { id: "audit",      label: "Audit Log" },
];

const EDD_TAB: { id: Tab; label: string } = { id: "edd", label: "EDD" };

export default function ClientDetail({
  client,
  documents,
  fieldChanges,
  activeToken,
  purposeOptions = [],
  frequencyOptions = [],
  useOptions = [],
  eddQuestionnaire = null,
  eddResponses = [],
  eddDocuments = [],
  eddDocumentRequests = [],
  pendingRevival = null,
}: {
  client: ClientData;
  documents: DocumentRecord[];
  fieldChanges: FieldChange[];
  activeToken: ActiveToken | null;
  purposeOptions?: RelationshipOption[];
  frequencyOptions?: RelationshipOption[];
  useOptions?: RelationshipOption[];
  eddQuestionnaire?: EddQuestionnaire | null;
  eddResponses?: EddResponse[];
  eddDocuments?: EddDocument[];
  eddDocumentRequests?: EddDocumentRequest[];
  pendingRevival?: PendingRevival | null;
}) {
  const router = useRouter();
  const { hasRole } = useRoles();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sentResult, setSentResult] = useState<{ url: string; emailSent: boolean } | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showRevivalModal, setShowRevivalModal] = useState(false);
  const [invalidatePending, startInvalidateTransition] = useTransition();
  const d = client.individual_details;

  const isArchived = client.client_status === "archived";
  const canArchive =
    !isArchived &&
    (hasRole("aml_officer") || hasRole("broker") || hasRole("system_admin"));
  const canReviewRevival =
    isArchived &&
    pendingRevival &&
    (hasRole("aml_officer") || hasRole("system_admin"));

  const fullName = d ? `${d.first_name} ${d.last_name}` : "Unknown client";
  const kycBadge = KYC_STATUS_BADGES[client.kyc_status] ?? KYC_STATUS_BADGES.draft;
  const riskBadge = RISK_BADGES[client.risk_rating] ?? RISK_BADGES.not_assessed;

  function handleSent(url: string, emailSent: boolean) {
    setShowSendModal(false);
    setSentResult({ url, emailSent });
  }

  function handleInvalidate() {
    if (!activeToken) return;
    startInvalidateTransition(async () => {
      await invalidateKycTokenAction(activeToken.id, client.id);
      router.refresh();
    });
  }

  function handleResend() {
    setShowSendModal(true);
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showSendModal && (
        <SendToClientModal
          client={client}
          onClose={() => setShowSendModal(false)}
          onSent={handleSent}
        />
      )}
      {sentResult && (
        <SendResultModal
          url={sentResult.url}
          emailSent={sentResult.emailSent}
          clientEmail={d?.email ?? ""}
          onClose={() => { setSentResult(null); router.refresh(); }}
        />
      )}
      {showArchiveModal && (
        <TerminationModal
          clientId={client.id}
          onClose={() => setShowArchiveModal(false)}
          onDone={() => { setShowArchiveModal(false); router.refresh(); }}
        />
      )}
      {showRevivalModal && pendingRevival && (
        <AmlRevivalModal
          revivalId={pendingRevival.id}
          onClose={() => setShowRevivalModal(false)}
          onDone={(newClientId) => { router.push(`/clients/${newClientId}`); }}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-8 py-6">
          <Link
            href="/clients"
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-4 w-fit"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All clients
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                <Badge cls="bg-slate-100 text-slate-600">
                  {client.client_type === "individual" ? "Individual" : "Legal entity"}
                </Badge>
                <Badge cls={kycBadge.cls}>{kycBadge.label}</Badge>
                <Badge cls={riskBadge.cls}>{riskBadge.label}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1.5">
                {client.broker?.full_name
                  ? <>Assigned to <span className="font-medium text-slate-700">{client.broker.full_name}</span></>
                  : "No broker assigned"
                }
                <span className="mx-1.5 text-slate-300">·</span>
                Added {fmt(client.created_at)}
              </p>

              {/* Active token status bar */}
              {activeToken && (
                <div className="mt-3 flex items-center gap-3 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Link sent {fmt(activeToken.created_at)}
                    <span className="text-slate-400">·</span>
                    Expires {fmt(activeToken.expires_at, "datetime")}
                  </span>
                  <button
                    onClick={handleResend}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    Resend
                  </button>
                  <button
                    onClick={handleInvalidate}
                    disabled={invalidatePending}
                    className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {invalidatePending ? "Invalidating…" : "Invalidate link"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {!isArchived && (
                <>
                  <button
                    onClick={() => setActiveTab("kyc")}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 text-sm font-medium
                      rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Edit details
                  </button>
                  <button
                    onClick={() => setShowSendModal(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                      rounded-lg transition-colors"
                  >
                    {activeToken ? "Resend to client" : "Send to client"}
                  </button>
                  <StatusDropdown
                    clientId={client.id}
                    currentStatus={client.kyc_status}
                    onDone={() => router.refresh()}
                  />
                </>
              )}
              {canArchive && (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="px-3.5 py-2 border border-red-200 text-red-600 text-sm font-medium
                    rounded-lg hover:bg-red-50 transition-colors"
                >
                  Archive client
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Archived banner */}
        {isArchived && (
          <div className="px-8 pb-3">
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-700">
                    Client archived
                    {client.archived_at && ` · ${fmt(client.archived_at)}`}
                  </span>
                  {client.termination_category === "aml" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      AML termination
                    </span>
                  )}
                  {client.revival_requires_aml_review && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      Revival requires AML review
                    </span>
                  )}
                </div>
                {canReviewRevival && (
                  <button
                    onClick={() => setShowRevivalModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Review revival request
                  </button>
                )}
              </div>
              {client.termination_reason && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Reason:</span>{" "}
                  {TERMINATION_REASON_LABELS[client.termination_reason] ?? client.termination_reason}
                </p>
              )}
              {client.termination_notes && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Notes:</span> {client.termination_notes}
                </p>
              )}
              {pendingRevival && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs text-blue-700 font-medium">
                    Revival request pending review
                    {pendingRevival.created_at && ` · Submitted ${fmt(pendingRevival.created_at)}`}
                  </p>
                  {pendingRevival.revival_justification && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Justification: {pendingRevival.revival_justification}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDD banner */}
        {client.edd_status === "triggered" && (
          <div className="px-8 pb-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm font-semibold text-red-800">
                EDD triggered — Client is a PEP. Enhanced Due Diligence required.
              </p>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="px-8 flex gap-0">
          {[...TABS_BASE, ...(client.edd_status !== "not_required" ? [EDD_TAB] : [])].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
              {tab.id === "documents" && documents.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                  {documents.length}
                </span>
              )}
              {tab.id === "audit" && fieldChanges.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                  {fieldChanges.length}
                </span>
              )}
              {tab.id === "edd" && (
                client.edd_status === "triggered" || client.edd_status === "client_completed" || client.edd_status === "escalated"
              ) && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="px-8 py-6">
        {activeTab === "overview"   && <OverviewTab  client={client} />}
        {activeTab === "kyc"        && <KycDetailsTab client={client} purposeOptions={purposeOptions} frequencyOptions={frequencyOptions} useOptions={useOptions} />}
        {activeTab === "documents"  && <DocumentsTab client={client} documents={documents} />}
        {activeTab === "risk"       && <RiskTab client={client} />}
        {activeTab === "audit"      && <AuditTab fieldChanges={fieldChanges} />}
        {activeTab === "edd"        && (
          <EddTab
            clientId={client.id}
            eddStatus={client.edd_status}
            clientEmail={client.individual_details?.email ?? null}
            questionnaire={eddQuestionnaire}
            responses={eddResponses}
            documents={eddDocuments}
            documentRequests={eddDocumentRequests}
          />
        )}
      </div>
    </div>
  );
}
