"use client";

import { useState } from "react";
import AmlDocumentsTab from "./AmlDocumentsTab";
import ResponsiblePersonTab from "./ResponsiblePersonTab";

// ── Shared types ──────────────────────────────────────────────────────────────

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
  uploader_name: string | null;
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
  appointed_by_name: string | null;
}

export interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string;
}

export interface DocAcknowledgmentInfo {
  requirementId: string;
  requiredRoles: string[];
  specificUserIds: string[];
  requiresCurrentUser: boolean;
  userHasAcknowledged: boolean;
  progress?: { acknowledged: number; total: number };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  documents: ComplianceDocument[];
  responsiblePersons: ResponsiblePerson[];
  profiles: ProfileOption[];
  canManage: boolean;
  canRevoke: boolean;
  initialTab: "documents" | "responsible";
  acknowledgmentInfo: Record<string, DocAcknowledgmentInfo>;
}

const TABS = [
  { id: "documents",   label: "AML Documents" },
  { id: "responsible", label: "Responsible Person" },
] as const;

export default function AmlDocumentsPage({
  documents,
  responsiblePersons,
  profiles,
  canManage,
  canRevoke,
  initialTab,
  acknowledgmentInfo,
}: Props) {
  const [tab, setTab] = useState<"documents" | "responsible">(initialTab);

  const activeCount = responsiblePersons.filter((p) => p.status === "active").length;

  return (
    <div className="p-4 md:p-8 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Compliance</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Compliance documentation and responsible person management
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-5 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
            >
              {t.label}
              {t.id === "responsible" && activeCount === 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full
                  bg-red-500 text-white text-[10px] font-bold">!</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "documents" ? (
        <AmlDocumentsTab documents={documents} canManage={canManage} profiles={profiles} acknowledgmentInfo={acknowledgmentInfo} />
      ) : (
        <ResponsiblePersonTab
          responsiblePersons={responsiblePersons}
          profiles={profiles}
          canManage={canManage}
          canRevoke={canRevoke}
        />
      )}
    </div>
  );
}
