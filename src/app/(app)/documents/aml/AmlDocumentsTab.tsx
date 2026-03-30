"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getComplianceUploadUrlAction,
  recordComplianceDocumentAction,
  updateComplianceDocumentMetadataAction,
  getComplianceDocumentUrlAction,
} from "@/app/actions/documents";
import type { ComplianceDocument } from "./AmlDocumentsPage";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DOC_TYPE_LABELS: Record<string, string> = {
  aml_policy:                                   "AML Policy",
  internal_control_procedures:                  "Internal Control",
  risk_assessment_methodology:                  "Risk Assessment",
  staff_training_programme:                     "Training Programme",
  suspicious_transaction_reporting_procedure:   "STR Procedure",
  customer_due_diligence_procedure:             "CDD Procedure",
  sanctions_implementation_procedure:           "Sanctions Procedure",
  monitoring_procedure:                         "Monitoring Procedure",
  other:                                        "Other",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  aml_policy:                                   "bg-violet-100 text-violet-700",
  internal_control_procedures:                  "bg-blue-100 text-blue-700",
  risk_assessment_methodology:                  "bg-orange-100 text-orange-700",
  staff_training_programme:                     "bg-emerald-100 text-emerald-700",
  suspicious_transaction_reporting_procedure:   "bg-red-100 text-red-700",
  customer_due_diligence_procedure:             "bg-indigo-100 text-indigo-700",
  sanctions_implementation_procedure:           "bg-amber-100 text-amber-700",
  monitoring_procedure:                         "bg-cyan-100 text-cyan-700",
  other:                                        "bg-slate-100 text-slate-600",
};

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS);

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "aml_policy",                                   label: "AML Policy" },
  { value: "internal_control_procedures",                  label: "Internal Control" },
  { value: "risk_assessment_methodology",                  label: "Risk Assessment" },
  { value: "staff_training_programme",                     label: "Training" },
  { value: "suspicious_transaction_reporting_procedure",   label: "STR Procedure" },
  { value: "customer_due_diligence_procedure",             label: "CDD Procedure" },
  { value: "sanctions_implementation_procedure",           label: "Sanctions" },
  { value: "monitoring_procedure",                         label: "Monitoring" },
  { value: "other",                                        label: "Other" },
];

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function suggestNextVersion(docs: ComplianceDocument[], type: string): { version: string; versionNumber: number } {
  const existing = docs
    .filter((d) => d.document_type === type)
    .sort((a, b) => b.version_number - a.version_number);
  if (existing.length === 0) return { version: "1.0", versionNumber: 1 };
  const latest = existing[0];
  const parts = latest.version.split(".");
  const major = parseInt(parts[0] ?? "1", 10);
  const minor = parseInt(parts[1] ?? "0", 10);
  return {
    version: `${major}.${minor + 1}`,
    versionNumber: latest.version_number + 1,
  };
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  documents: ComplianceDocument[];
  prefillType?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ documents, prefillType, onClose, onSuccess }: UploadModalProps) {
  const [docType, setDocType] = useState(prefillType ?? "");
  const [title, setTitle] = useState("");
  const [versionStr, setVersionStr] = useState("");
  const [versionNum, setVersionNum] = useState(1);
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [approvalDate, setApprovalDate] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [nextReview, setNextReview] = useState("");
  const [changelog, setChangelog] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTypeChange(t: string) {
    setDocType(t);
    if (t) {
      const { version, versionNumber } = suggestNextVersion(documents, t);
      setVersionStr(version);
      setVersionNum(versionNumber);
    }
  }

  function handleApprovalDateChange(v: string) {
    setApprovalDate(v);
    if (v && !nextReview) setNextReview(addMonths(v, 12));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docType || !title || !versionStr || !file) {
      setError("Please fill all required fields and select a file.");
      return;
    }
    if (versionNum > 1 && !changelog.trim()) {
      setError("Changelog is required when uploading a new version.");
      return;
    }
    setIsUploading(true);
    setError("");

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `default/${docType}/${Date.now()}-${safeName}`;

      const { signedUrl, error: urlErr } = await getComplianceUploadUrlAction(path);
      if (urlErr || !signedUrl) throw new Error(urlErr ?? "Upload URL failed");

      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      if (!res.ok) throw new Error("File upload failed");

      const { error: recErr } = await recordComplianceDocumentAction({
        document_type:    docType,
        title,
        description:      description || null,
        version:          versionStr,
        version_number:   versionNum,
        status,
        file_name:        file.name,
        file_path:        path,
        file_size:        file.size,
        mime_type:        file.type || "application/pdf",
        approval_date:    approvalDate || null,
        approved_by_name: approvedBy || null,
        next_review_date: nextReview || null,
        changelog:        changelog || null,
      });
      if (recErr) throw new Error(recErr);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setIsUploading(false);
    }
  }

  const needsChangelog = versionNum > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Upload compliance document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form id="upload-doc-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Document type <span className="text-red-500">*</span>
            </label>
            <select className={selectCls} value={docType} onChange={(e) => handleTypeChange(e.target.value)} required>
              <option value="">Select type…</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {/* Version */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Version <span className="text-red-500">*</span>
              </label>
              <input className={inputCls} value={versionStr} onChange={(e) => setVersionStr(e.target.value)}
                placeholder="e.g. 1.0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Version number</label>
              <input type="number" min={1} className={inputCls} value={versionNum}
                onChange={(e) => setVersionNum(parseInt(e.target.value) || 1)} />
            </div>
          </div>

          {/* File */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              File (PDF, max 50 MB) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg
                  hover:bg-slate-50 transition-colors">
                {file ? "Change file" : "Select file"}
              </button>
              {file && <span className="text-sm text-slate-600 truncate">{file.name}</span>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex gap-3">
              {(["active", "draft"] as const).map((s) => (
                <label key={s} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer
                  transition-colors text-sm ${status === s ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" className="accent-blue-600" checked={status === s} onChange={() => setStatus(s)} />
                  {s === "active" ? "Active" : "Draft"}
                </label>
              ))}
            </div>
            {status === "active" && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Setting status to Active will automatically supersede any existing active version of this document type.
              </p>
            )}
          </div>

          {/* Approval */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approval date</label>
              <input type="date" className={inputCls} value={approvalDate}
                onChange={(e) => handleApprovalDateChange(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approved by</label>
              <input className={inputCls} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Name / title" />
            </div>
          </div>

          {/* Next review */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Next review date {approvalDate && <span className="text-slate-400 font-normal">(auto-set to +12 months)</span>}
            </label>
            <input type="date" className={inputCls} value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
          </div>

          {/* Changelog */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Changelog {needsChangelog && <span className="text-red-500">*</span>}
            </label>
            <textarea rows={3} className={inputCls + " resize-none"} value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Describe what changed in this version…" required={needsChangelog} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
            <textarea rows={2} className={inputCls + " resize-none"} value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button form="upload-doc-form" type="submit"
            disabled={isUploading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition">
            {isUploading ? "Uploading…" : "Upload document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Metadata Modal ───────────────────────────────────────────────────────

interface EditMetadataModalProps {
  doc: ComplianceDocument;
  onClose: () => void;
  onSuccess: () => void;
}

function EditMetadataModal({ doc, onClose, onSuccess }: EditMetadataModalProps) {
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? "");
  const [approvalDate, setApprovalDate] = useState(doc.approval_date ?? "");
  const [approvedBy, setApprovedBy] = useState(doc.approved_by_name ?? "");
  const [nextReview, setNextReview] = useState(doc.next_review_date ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSave() {
    startTransition(async () => {
      const res = await updateComplianceDocumentMetadataAction(doc.id, {
        title:             title || doc.title,
        description:       description || null,
        approval_date:     approvalDate || null,
        approved_by_name:  approvedBy || null,
        next_review_date:  nextReview || null,
      });
      if (res.error) { setError(res.error); return; }
      onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Edit document metadata</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={2} className={inputCls + " resize-none"} value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approval date</label>
              <input type="date" className={inputCls} value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Approved by</label>
              <input className={inputCls} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Next review date</label>
            <input type="date" className={inputCls} value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition">
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: ComplianceDocument;
  allDocs: ComplianceDocument[];
  canManage: boolean;
  onUploadNewVersion: (type: string) => void;
  onEdit: (doc: ComplianceDocument) => void;
}

function DocumentCard({ doc, allDocs, canManage, onUploadNewVersion, onEdit }: DocumentCardProps) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const reviewOverdue = doc.next_review_date && doc.next_review_date < today && doc.status === "active";

  // Find the document that superseded this one
  const supersedingDoc = doc.superseded_by
    ? allDocs.find((d) => d.id === doc.superseded_by)
    : null;

  async function handleDownload() {
    setDownloading(true);
    const { url, error } = await getComplianceDocumentUrlAction(doc.file_path);
    setDownloading(false);
    if (error || !url) { alert(error ?? "Download failed"); return; }
    window.open(url, "_blank");
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all
      ${doc.status === "superseded" ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
      {/* Card header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 flex-wrap">
          {/* Type badge */}
          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium
            ${DOC_TYPE_COLORS[doc.document_type] ?? "bg-slate-100 text-slate-600"}`}>
            {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
          </span>
          {/* Version */}
          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            v{doc.version}
          </span>
          {/* Status */}
          {doc.status === "active" && (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              Active
            </span>
          )}
          {doc.status === "draft" && (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              Draft
            </span>
          )}
          {doc.status === "superseded" && (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
              Superseded
            </span>
          )}
        </div>
        <h3 className={`mt-2.5 text-sm font-semibold text-slate-800 leading-snug
          ${doc.status === "superseded" ? "line-through text-slate-400" : ""}`}>
          {doc.title}
        </h3>
        {doc.description && (
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{doc.description}</p>
        )}
      </div>

      {/* Metadata row */}
      <div className="px-5 pb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
        <span>Uploaded {fmtDate(doc.uploaded_at)}{doc.uploader_name ? ` by ${doc.uploader_name}` : ""}</span>

        {/* Approval */}
        {doc.approval_date ? (
          <span>Approved {fmtDate(doc.approval_date)}{doc.approved_by_name ? ` — ${doc.approved_by_name}` : ""}</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending approval</span>
        )}

        {/* Review date */}
        {doc.next_review_date && (
          reviewOverdue ? (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Review overdue: {fmtDate(doc.next_review_date)}
            </span>
          ) : (
            <span>Review due: {fmtDate(doc.next_review_date)}</span>
          )
        )}

        {/* Superseded by */}
        {doc.status === "superseded" && supersedingDoc && (
          <span className="text-slate-400">
            Superseded by <span className="font-medium text-slate-600">v{supersedingDoc.version}</span>
          </span>
        )}
      </div>

      {/* Changelog (expandable, only if version > 1) */}
      {doc.changelog && doc.version_number > 1 && (
        <div className="px-5 pb-3">
          <button onClick={() => setChangelogOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
            <svg className={`w-3.5 h-3.5 transition-transform ${changelogOpen ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Changelog
          </button>
          {changelogOpen && (
            <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
              {doc.changelog}
            </p>
          )}
        </div>
      )}

      {/* Actions footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2">
        <button onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700
            border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? "Loading…" : "Download"}
        </button>

        {canManage && (
          <>
            <button onClick={() => onEdit(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700
                border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit metadata
            </button>
            <button onClick={() => onUploadNewVersion(doc.document_type)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700
                border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload new version
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main tab component ────────────────────────────────────────────────────────

interface AmlDocumentsTabProps {
  documents: ComplianceDocument[];
  canManage: boolean;
}

export default function AmlDocumentsTab({ documents, canManage }: AmlDocumentsTabProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPrefillType, setUploadPrefillType] = useState("");
  const [editingDoc, setEditingDoc] = useState<ComplianceDocument | null>(null);

  function openUpload(type = "") {
    setUploadPrefillType(type);
    setShowUpload(true);
  }

  function handleSuccess() {
    setShowUpload(false);
    setEditingDoc(null);
    router.refresh();
  }

  // Group documents by type, sorted by version_number desc within each group
  const filteredTypes = filter ? [filter] : DOC_TYPES.filter(
    (t) => documents.some((d) => d.document_type === t)
  );

  const groupedDocs = filteredTypes
    .map((type) => ({
      type,
      docs: documents
        .filter((d) => d.document_type === type)
        .sort((a, b) => b.version_number - a.version_number),
    }))
    .filter((g) => g.docs.length > 0);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div />
        {canManage && (
          <button onClick={() => openUpload()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
              text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload document
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTER_TABS.map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors
              ${filter === t.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Document groups */}
      {groupedDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">No documents yet</p>
          <p className="text-slate-400 text-sm">
            {canManage ? "Upload your first compliance document to get started." : "No compliance documents have been uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedDocs.map(({ type, docs }) => (
            <div key={type}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                {DOC_TYPE_LABELS[type] ?? type}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    allDocs={documents}
                    canManage={canManage}
                    onUploadNewVersion={openUpload}
                    onEdit={setEditingDoc}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <UploadModal
          documents={documents}
          prefillType={uploadPrefillType}
          onClose={() => setShowUpload(false)}
          onSuccess={handleSuccess}
        />
      )}
      {editingDoc && (
        <EditMetadataModal
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
