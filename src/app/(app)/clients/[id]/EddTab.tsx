"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useRoles } from "@/context/RolesContext";
import {
  sendEddToClientAction,
  submitAmlOfficerAssessmentAction,
  submitSeniorManagerDecisionAction,
  resendEddAction,
  createEddDocumentRequestAction,
  deleteEddDocumentRequestAction,
  reviewEddDocumentAction,
  getEddDocumentUrlAction,
} from "@/app/actions/edd";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EddQuestionnaire {
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
}

export interface EddResponse {
  id: string;
  question_key: string;
  answer: string | null;
}

export interface EddDocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface EddDocument {
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

interface EddTabProps {
  clientId: string;
  eddStatus: string;
  clientEmail: string | null;
  questionnaire: EddQuestionnaire | null;
  responses: EddResponse[];
  documents: EddDocument[];
  documentRequests: EddDocumentRequest[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const EDD_STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  triggered:        { label: "Triggered",       cls: "bg-red-100 text-red-700",         dot: "bg-red-500" },
  sent_to_client:   { label: "Sent to client",   cls: "bg-orange-100 text-orange-700",   dot: "bg-orange-500" },
  client_completed: { label: "Client completed", cls: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  under_review:     { label: "Under review",     cls: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  escalated:        { label: "Escalated",        cls: "bg-red-100 text-red-700",         dot: "bg-red-500" },
  completed:        { label: "Completed",        cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending review", cls: "bg-slate-100 text-slate-500" },
  accepted: { label: "Accepted",       cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected",       cls: "bg-red-100 text-red-700" },
};

const REJECTION_REASONS: { value: string; label: string }[] = [
  { value: "irrelevant",     label: "Irrelevant document" },
  { value: "unreadable",     label: "Unreadable / poor quality" },
  { value: "not_legalized",  label: "Not legalized / not notarized" },
  { value: "insufficient",   label: "Insufficient evidence" },
  { value: "other",          label: "Other (specify in comments)" },
];

const QUESTION_LABELS: Record<string, string> = {
  pep_role: "PEP role / position", pep_country: "Country of exposure", pep_period: "Period of activity",
  source_of_wealth: "Source of wealth", net_worth_range: "Net worth (approx.)",
  source_of_funds_transaction: "Source of funds (this transaction)", third_party_funds: "Third-party funds involved",
  third_party_details: "Third-party details", countries_involved: "Countries involved",
  politically_exposed_relatives: "Related PEP persons", pep_relatives_details: "Related PEP details",
  additional_information: "Additional information",
  property_acquisition_source: "Property acquisition method", property_acquisition_year: "Year of acquisition",
  proceeds_usage: "Use of sale proceeds", mortgage_outstanding: "Outstanding mortgage",
  funds_origin_country: "Funds origin country", bank_account_country: "Bank account country",
  purchase_purpose: "Purchase purpose", additional_properties: "Other properties owned",
  employment_status: "Employment status", employer_or_business: "Employer / business",
  monthly_income_range: "Monthly income (approx.)", rent_source_of_funds: "Source of rent funds",
  total_properties_owned: "Total properties owned", rental_income_declared: "Rental income declared",
  rental_property_acquisition: "Property acquisition",
};

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none";

// ── Send EDD modal ─────────────────────────────────────────────────────────────

function SendEddModal({
  clientId, hasEmail, onClose, onSent,
}: {
  clientId: string; hasEmail: boolean;
  onClose: () => void; onSent: (url: string, emailSent: boolean) => void;
}) {
  const [language, setLanguage] = useState<"lt" | "en">("lt");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    startTransition(async () => {
      setError(null);
      const res = await sendEddToClientAction(clientId, language);
      if (res.ok) onSent(res.url, res.emailSent);
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Send EDD questionnaire</h2>
        <p className="text-sm text-slate-500 mb-5">
          This will {hasEmail ? "email a secure EDD link to the client" : "generate a secure EDD link to share manually"}.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value as "lt" | "en")}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="lt">Lithuanian / Lietuvių</option>
            <option value="en">English</option>
          </select>
        </div>
        {!hasEmail && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">No email on file — link will be generated for manual sharing.</p>
          </div>
        )}
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-xs text-red-700">{error}</p></div>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
          <button onClick={handleSend} disabled={isPending}
            className="px-5 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isPending ? "Sending…" : "Send EDD link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document review modal ──────────────────────────────────────────────────────

function ReviewModal({
  doc, clientId, onClose, onDone,
}: {
  doc: EddDocument; clientId: string;
  onClose: () => void; onDone: () => void;
}) {
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [decision, setDecision]             = useState<"accepted" | "rejected" | "">("");
  const [notes, setNotes]                   = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition]        = useTransition();
  const [error, setError]                   = useState<string | null>(null);

  // Load signed URL on mount
  useState(() => {
    getEddDocumentUrlAction(doc.id).then((res) => {
      setPreviewLoading(false);
      if (res.ok) setPreviewUrl(res.url);
    });
  });

  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(doc.file_name);
  const isPdf   = /\.pdf$/i.test(doc.file_name);

  function handleSubmit() {
    if (!decision) return;
    if (decision === "rejected" && !rejectionReason) { setError("Please select a rejection reason."); return; }
    startTransition(async () => {
      setError(null);
      const res = await reviewEddDocumentAction(doc.id, clientId, decision, notes, rejectionReason || undefined);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900 truncate pr-4">{doc.file_name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {previewLoading ? (
              <div className="flex items-center justify-center h-48 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-400">Loading preview…</p>
              </div>
            ) : previewUrl ? (
              isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={doc.file_name} className="max-w-full rounded-xl border border-slate-200" />
              ) : isPdf ? (
                <iframe src={previewUrl} className="w-full h-96 rounded-xl border border-slate-200" title={doc.file_name} />
              ) : (
                <div className="flex items-center justify-center h-32 bg-slate-50 rounded-xl border border-slate-200">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download to view
                  </a>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-32 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-500">Could not load preview</p>
              </div>
            )}
          </div>

          {/* Review form */}
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Decision <span className="text-red-500">*</span></label>
              <div className="flex gap-3">
                {(["accepted", "rejected"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="review_decision" value={opt} checked={decision === opt}
                      onChange={() => { setDecision(opt); if (opt === "accepted") setRejectionReason(""); }}
                      className="accent-blue-600" />
                    <span className={`text-sm font-medium capitalize ${opt === "accepted" ? "text-emerald-700" : "text-red-700"}`}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {decision === "rejected" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rejection reason <span className="text-red-500">*</span></label>
                <select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select reason…</option>
                  {REJECTION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Comments {decision === "rejected" && rejectionReason === "other" && <span className="text-red-500">*</span>}
              </label>
              <textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional comments…" />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleSubmit} disabled={isPending || !decision}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  decision === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}>
                {isPending ? "Saving…" : decision === "accepted" ? "Accept document" : decision === "rejected" ? "Reject document" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document requests management card ─────────────────────────────────────────

function DocumentRequestsCard({
  eddId, clientId, documentRequests,
}: {
  eddId: string; clientId: string; documentRequests: EddDocumentRequest[];
}) {
  const router = useRouter();
  const [newName, setNewName]           = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [newRequired, setNewRequired]   = useState(true);
  const [addPending, startAddTransition] = useTransition();
  const [delPending, setDelPending]     = useState<string | null>(null);
  const [addError, setAddError]         = useState<string | null>(null);

  function handleAdd() {
    if (!newName.trim()) { setAddError("Document name is required"); return; }
    startAddTransition(async () => {
      setAddError(null);
      const res = await createEddDocumentRequestAction(
        eddId, clientId, newName, newDesc, newRequired, documentRequests.length
      );
      if (res.ok) {
        setNewName(""); setNewDesc(""); setNewRequired(true);
        router.refresh();
      } else {
        setAddError(res.error);
      }
    });
  }

  async function handleDelete(reqId: string) {
    setDelPending(reqId);
    const res = await deleteEddDocumentRequestAction(reqId, clientId);
    if (res.ok) router.refresh();
    setDelPending(null);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Document Requests</h3>
        <p className="text-xs text-slate-400 mt-0.5">Specify which documents the client must upload.</p>
      </div>

      {/* Existing requests */}
      {documentRequests.length > 0 && (
        <div className="divide-y divide-slate-100">
          {documentRequests.map((req) => (
            <div key={req.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">{req.document_name}</span>
                  {req.is_required
                    ? <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full shrink-0">Required</span>
                    : <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full shrink-0">Optional</span>
                  }
                </div>
                {req.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{req.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(req.id)}
                disabled={delPending === req.id}
                className="text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new request form */}
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
        <p className="text-xs font-medium text-slate-600">Add document request</p>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Document name (e.g. Proof of property ownership)"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
        />
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Instructions (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-xs text-slate-600">Required</span>
          </label>
          <button
            onClick={handleAdd}
            disabled={addPending}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {addPending ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && <p className="text-xs text-red-600">{addError}</p>}
      </div>
    </div>
  );
}

// ── Main EddTab ────────────────────────────────────────────────────────────────

export default function EddTab({
  clientId,
  eddStatus,
  clientEmail,
  questionnaire,
  responses,
  documents,
  documentRequests,
}: EddTabProps) {
  const { hasAnyRole } = useRoles();
  const router = useRouter();

  const [showSendModal, setShowSendModal]   = useState(false);
  const [sentResult, setSentResult]         = useState<{ url: string; emailSent: boolean } | null>(null);
  const [reviewingDoc, setReviewingDoc]     = useState<EddDocument | null>(null);

  // AML officer assessment
  const [amlNotes, setAmlNotes]             = useState(questionnaire?.aml_officer_notes ?? "");
  const [amlRecommendation, setAmlRecommendation] = useState<"approve" | "escalate" | "reject" | "">(
    (questionnaire?.aml_officer_recommendation as "approve" | "escalate" | "reject") ?? ""
  );
  const [amlPending, startAmlTransition]    = useTransition();
  const [amlError, setAmlError]             = useState<string | null>(null);
  const [amlDone, setAmlDone]               = useState(!!questionnaire?.aml_officer_reviewed_at);

  // Senior manager decision
  const [smNotes, setSmNotes]               = useState(questionnaire?.senior_manager_notes ?? "");
  const [smDecision, setSmDecision]         = useState<"approved" | "rejected" | "">(
    (questionnaire?.senior_manager_decision as "approved" | "rejected") ?? ""
  );
  const [smPending, startSmTransition]      = useTransition();
  const [smError, setSmError]               = useState<string | null>(null);
  const [smDone, setSmDone]                 = useState(!!questionnaire?.senior_manager_reviewed_at);

  // Resend
  const [resendPending, startResendTransition] = useTransition();
  const [resendResult, setResendResult]     = useState<string | null>(null);

  const statusConfig  = EDD_STATUS_CONFIG[eddStatus] ?? EDD_STATUS_CONFIG.triggered;
  const isAmlOfficer  = hasAnyRole(["aml_officer", "system_admin"]);
  const isSeniorManager = hasAnyRole(["senior_manager", "system_admin"]);
  const canEditRequests = ["triggered", "sent_to_client"].includes(eddStatus);
  const hasRejectedDocs = documents.some((d) => d.review_status === "rejected");

  function handleSent(url: string, emailSent: boolean) {
    setShowSendModal(false);
    setSentResult({ url, emailSent });
    router.refresh();
  }

  function handleAmlSubmit() {
    if (!questionnaire || !amlRecommendation) return;
    startAmlTransition(async () => {
      setAmlError(null);
      const res = await submitAmlOfficerAssessmentAction(questionnaire.id, clientId, amlNotes, amlRecommendation);
      if (res.ok) { setAmlDone(true); router.refresh(); } else setAmlError(res.error);
    });
  }

  function handleSmSubmit() {
    if (!questionnaire || !smDecision) return;
    startSmTransition(async () => {
      setSmError(null);
      const res = await submitSeniorManagerDecisionAction(questionnaire.id, clientId, smNotes, smDecision);
      if (res.ok) { setSmDone(true); router.refresh(); } else setSmError(res.error);
    });
  }

  function handleResend() {
    if (!questionnaire) return;
    startResendTransition(async () => {
      setResendResult(null);
      const res = await resendEddAction(clientId, questionnaire.id);
      if (res.ok) { setResendResult("EDD email resent successfully."); router.refresh(); }
      else setResendResult(`Error: ${res.error}`);
    });
  }

  return (
    <>
      {showSendModal && (
        <SendEddModal clientId={clientId} hasEmail={!!clientEmail}
          onClose={() => setShowSendModal(false)} onSent={handleSent} />
      )}
      {reviewingDoc && (
        <ReviewModal doc={reviewingDoc} clientId={clientId}
          onClose={() => setReviewingDoc(null)} onDone={() => { setReviewingDoc(null); router.refresh(); }} />
      )}

      <div className="space-y-5">

        {/* Status card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">EDD Status</h3>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
              <span className="text-xs text-slate-400">Triggered: {questionnaire ? fmt(questionnaire.created_at) : "—"}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 text-sm mb-4">
              {[
                ["Trigger reason", questionnaire?.triggered_reason ?? "PEP"],
                ["Sent to client", fmt(questionnaire?.sent_at)],
                ["Client completed", fmt(questionnaire?.client_completed_at)],
                ["AML reviewed", fmt(questionnaire?.aml_officer_reviewed_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 text-xs">{label}</span>
                  <span className="text-slate-700 text-xs capitalize">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {eddStatus === "triggered" && (
                <button onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors">
                  Send EDD to client
                </button>
              )}
              {eddStatus === "sent_to_client" && (
                <>
                  <button onClick={() => setShowSendModal(true)}
                    className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors">
                    Resend EDD link
                  </button>
                  {questionnaire && (
                    <button onClick={handleResend} disabled={resendPending}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">
                      {resendPending ? "Resending…" : "Resend email"}
                    </button>
                  )}
                </>
              )}
            </div>

            {sentResult && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-medium text-emerald-800 mb-1">EDD link {sentResult.emailSent ? "sent via email" : "generated"}</p>
                <p className="text-xs text-emerald-700 break-all">{sentResult.url}</p>
              </div>
            )}
            {resendResult && (
              <p className={`mt-2 text-xs ${resendResult.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>{resendResult}</p>
            )}
          </div>
        </div>

        {/* Document requests (editable when triggered or sent_to_client) */}
        {canEditRequests && questionnaire && (
          <DocumentRequestsCard eddId={questionnaire.id} clientId={clientId} documentRequests={documentRequests} />
        )}

        {/* Document requests summary (read-only for later stages) */}
        {!canEditRequests && documentRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Requested Documents</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {documentRequests.map((req) => (
                <div key={req.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-800">{req.document_name}</span>
                  {req.is_required
                    ? <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full">Required</span>
                    : <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">Optional</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client responses */}
        {responses.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Client Responses</h3>
            </div>
            <div className="px-5 py-2">
              {responses.map((r) => (
                <div key={r.id} className="flex flex-col gap-0.5 py-3 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-medium text-slate-500">
                    {QUESTION_LABELS[r.question_key] ?? r.question_key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-slate-800 whitespace-pre-wrap">
                    {r.answer || <span className="text-slate-400 italic">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">EDD Documents</h3>
              {hasRejectedDocs && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Rejected documents — consider resending EDD
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const req          = documentRequests.find((r) => r.id === doc.request_id);
                const reviewCfg    = REVIEW_STATUS_CONFIG[doc.review_status ?? "pending"];
                const canReview    = isAmlOfficer && !doc.review_status;

                return (
                  <div key={doc.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${reviewCfg.cls}`}>
                            {reviewCfg.label}
                          </span>
                        </div>
                        {req && (
                          <p className="text-xs text-slate-400 mt-0.5">For: {req.document_name}</p>
                        )}
                        {doc.review_status === "accepted" && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Accepted by {doc.reviewer?.full_name ?? "reviewer"} · {fmt(doc.reviewed_at)}
                            {doc.review_notes && ` · "${doc.review_notes}"`}
                          </p>
                        )}
                        {doc.review_status === "rejected" && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-red-600">
                              Rejected by {doc.reviewer?.full_name ?? "reviewer"} · {fmt(doc.reviewed_at)}
                            </p>
                            {doc.review_rejection_reason && (
                              <p className="text-xs text-red-500">
                                Reason: {REJECTION_REASONS.find((r) => r.value === doc.review_rejection_reason)?.label ?? doc.review_rejection_reason}
                              </p>
                            )}
                            {doc.review_notes && <p className="text-xs text-slate-500">{doc.review_notes}</p>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{fmt(doc.created_at)}</span>
                        {canReview && (
                          <button
                            onClick={() => setReviewingDoc(doc)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AML officer assessment */}
        {isAmlOfficer && questionnaire && ["client_completed", "under_review", "escalated", "completed"].includes(eddStatus) && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">AML Officer Assessment</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {amlDone ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Recommendation:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      amlRecommendation === "approve" ? "bg-emerald-100 text-emerald-700"
                      : amlRecommendation === "escalate" ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                    }`}>{amlRecommendation || questionnaire.aml_officer_recommendation}</span>
                  </div>
                  {(amlNotes || questionnaire.aml_officer_notes) && (
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {amlNotes || questionnaire.aml_officer_notes}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Reviewed {fmt(questionnaire.aml_officer_reviewed_at)}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                    <textarea rows={4} className={inputCls} value={amlNotes}
                      onChange={(e) => setAmlNotes(e.target.value)} placeholder="Assessment notes…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Recommendation <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {(["approve", "escalate", "reject"] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="aml_recommendation" value={opt}
                            checked={amlRecommendation === opt} onChange={() => setAmlRecommendation(opt)}
                            className="accent-blue-600" />
                          <span className={`text-sm font-medium capitalize ${
                            opt === "approve" ? "text-emerald-700" : opt === "escalate" ? "text-amber-700" : "text-red-700"
                          }`}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {amlError && <p className="text-xs text-red-600">{amlError}</p>}
                  <button onClick={handleAmlSubmit} disabled={amlPending || !amlRecommendation}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {amlPending ? "Submitting…" : "Submit assessment"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Senior manager decision */}
        {isSeniorManager && questionnaire && eddStatus === "escalated" && (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-100 bg-red-50">
              <h3 className="text-sm font-semibold text-red-800">Senior Manager Decision Required</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {smDone ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Decision:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      smDecision === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{smDecision || questionnaire.senior_manager_decision}</span>
                  </div>
                  {(smNotes || questionnaire.senior_manager_notes) && (
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {smNotes || questionnaire.senior_manager_notes}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Decided {fmt(questionnaire.senior_manager_reviewed_at)}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-red-700">This EDD has been escalated and requires a senior manager decision.</p>
                  {questionnaire.aml_officer_notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-amber-700 mb-1">AML Officer notes:</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{questionnaire.aml_officer_notes}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Decision notes</label>
                    <textarea rows={4} className={inputCls} value={smNotes}
                      onChange={(e) => setSmNotes(e.target.value)} placeholder="Decision rationale…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Decision <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      {(["approved", "rejected"] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="sm_decision" value={opt}
                            checked={smDecision === opt} onChange={() => setSmDecision(opt)}
                            className="accent-blue-600" />
                          <span className={`text-sm font-medium capitalize ${opt === "approved" ? "text-emerald-700" : "text-red-700"}`}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {smError && <p className="text-xs text-red-600">{smError}</p>}
                  <button onClick={handleSmSubmit} disabled={smPending || !smDecision}
                    className="px-5 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {smPending ? "Submitting…" : "Submit decision"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
