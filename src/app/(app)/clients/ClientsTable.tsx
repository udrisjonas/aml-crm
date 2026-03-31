"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useRoles } from "@/context/RolesContext";

export interface ClientRow {
  id: string;
  client_type: string;
  kyc_status: string;
  risk_rating: string;
  client_status: string;
  created_at: string;
  archived_at: string | null;
  termination_reason: string | null;
  termination_category: string | null;
  revival_requires_aml_review: boolean;
  individual_details: { first_name: string; last_name: string } | null;
  broker: { full_name: string | null } | null;
}

interface ClientsTableProps {
  clients: ClientRow[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  sort: string;
  dir: "asc" | "desc";
  search: string;
  riskFilter: string;
  kycFilter: string;
  showArchived: boolean;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const RISK_BADGE: Record<string, string> = {
  low:          "bg-emerald-100 text-emerald-700",
  medium:       "bg-amber-100  text-amber-700",
  high:         "bg-red-100    text-red-700",
  not_assessed: "bg-slate-100  text-slate-500",
};

const KYC_BADGE: Record<string, { label: string; className: string }> = {
  draft:                     { label: "Draft",               className: "bg-slate-100  text-slate-500" },
  sent_to_client:            { label: "Sent",                className: "bg-blue-100   text-blue-700" },
  client_completed:          { label: "Client Done",         className: "bg-violet-100 text-violet-700" },
  broker_verified_originals: { label: "Originals Verified",  className: "bg-violet-100 text-violet-700" },
  submitted:                 { label: "Submitted",           className: "bg-blue-100   text-blue-700" },
  under_review:              { label: "Under Review",        className: "bg-amber-100  text-amber-700" },
  edd_triggered:             { label: "EDD Triggered",       className: "bg-orange-100 text-orange-700" },
  edd_sent:                  { label: "EDD Sent",            className: "bg-orange-100 text-orange-700" },
  edd_completed:             { label: "EDD Completed",       className: "bg-violet-100 text-violet-700" },
  escalated:                 { label: "Escalated",           className: "bg-red-100    text-red-700" },
  verified:                  { label: "Verified",            className: "bg-emerald-100 text-emerald-700" },
  rejected:                  { label: "Rejected",            className: "bg-red-100    text-red-700" },
};

const RISK_OPTIONS = [
  { value: "", label: "All risk levels" },
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "not_assessed", label: "Not assessed" },
];

const KYC_OPTIONS = [
  { value: "", label: "All KYC statuses" },
  { value: "draft",                     label: "Draft" },
  { value: "sent_to_client",            label: "Sent to client" },
  { value: "client_completed",          label: "Client completed" },
  { value: "broker_verified_originals", label: "Originals verified" },
  { value: "submitted",                 label: "Submitted" },
  { value: "under_review",              label: "Under review" },
  { value: "edd_triggered",             label: "EDD triggered" },
  { value: "edd_sent",                  label: "EDD sent" },
  { value: "edd_completed",             label: "EDD completed" },
  { value: "escalated",                 label: "Escalated" },
  { value: "verified",                  label: "Verified" },
  { value: "rejected",                  label: "Rejected" },
];

const TERMINATION_REASON_LABELS: Record<string, string> = {
  relationship_completed:      "Relationship completed",
  client_request:              "Client request",
  no_longer_requires_services: "No longer requires services",
  cdd_not_completed:           "CDD not completed",
  suspicious_activity:         "Suspicious activity",
  sanctions_pep_concerns:      "Sanctions / PEP concerns",
  refused_information:         "Refused to provide information",
  other_aml_reason:            "Other AML reason",
};

function clientName(row: ClientRow): string {
  if (row.individual_details) {
    return `${row.individual_details.first_name} ${row.individual_details.last_name}`;
  }
  return "—";
}

function initials(row: ClientRow): string {
  if (row.individual_details) {
    return (
      (row.individual_details.first_name[0] ?? "") +
      (row.individual_details.last_name[0] ?? "")
    ).toUpperCase();
  }
  return "?";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const selectClass =
  "px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientsTable({
  clients,
  totalCount,
  currentPage,
  totalPages,
  sort,
  dir,
  search,
  riskFilter,
  kycFilter,
  showArchived,
}: ClientsTableProps) {
  const { hasRole } = useRoles();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

  const canAddClient =
    hasRole("broker") || hasRole("aml_officer") || hasRole("system_admin");

  // Sync search input when prop changes (e.g. back navigation)
  useEffect(() => { setSearchInput(search); }, [search]);

  // Debounce search → URL update
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) {
        navigate({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function buildHref(overrides: Record<string, string | number | boolean>) {
    const base: Record<string, string> = {};
    if (sort)        base.sort     = sort;
    if (dir)         base.dir      = dir;
    if (search)      base.search   = search;
    if (riskFilter)  base.risk     = riskFilter;
    if (kycFilter)   base.kyc      = kycFilter;
    if (showArchived) base.archived = "1";
    if (currentPage > 1) base.page = String(currentPage);

    const merged = { ...base, ...Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [k, String(v)])
    )};

    const params = new URLSearchParams();
    if (merged.sort && merged.sort !== "created_at") params.set("sort", merged.sort);
    if (merged.dir  && merged.dir  !== "desc")       params.set("dir",  merged.dir);
    if (Number(merged.page) > 1) params.set("page", merged.page);
    if (merged.search)   params.set("search",   merged.search);
    if (merged.risk)     params.set("risk",      merged.risk);
    if (merged.kyc)      params.set("kyc",       merged.kyc);
    if (merged.archived === "1") params.set("archived", "1");

    const qs = params.toString();
    return `/clients${qs ? `?${qs}` : ""}`;
  }

  function navigate(overrides: Record<string, string | number | boolean>) {
    startTransition(() => router.push(buildHref(overrides)));
  }

  function SortHeader({ col, label, hidden }: { col: string; label: string; hidden?: string }) {
    const isActive = sort === col;
    const nextDir: "asc" | "desc" = isActive && dir === "asc" ? "desc" : "asc";
    return (
      <button
        onClick={() => navigate({ sort: col, dir: nextDir, page: 1 })}
        className={`flex items-center gap-1 group font-medium text-slate-500 text-xs uppercase tracking-wider hover:text-slate-800 transition-colors ${hidden ?? ""}`}
      >
        {label}
        <span className={`transition-colors ${isActive ? "text-slate-700" : "text-slate-300 group-hover:text-slate-500"}`}>
          {isActive ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage client profiles and KYC records
          </p>
        </div>
        {canAddClient && (
          <Link
            href="/clients/new"
            className="w-full sm:w-auto text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700
              text-white text-sm font-medium rounded-lg transition"
          >
            + Add Client
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-5 md:mb-6">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name…"
          className="w-full md:flex-1 md:min-w-[200px] md:max-w-sm px-3.5 py-2 rounded-lg
            border border-slate-300 text-sm text-slate-800 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => navigate({ risk: e.target.value, page: 1 })}
            className={selectClass + " flex-1"}
          >
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={kycFilter}
            onChange={(e) => navigate({ kyc: e.target.value, page: 1 })}
            className={selectClass + " flex-1"}
          >
            {KYC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => navigate({ archived: showArchived ? "" : "1", page: 1, search: "", risk: "", kyc: "", sort: "created_at", dir: "desc" })}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showArchived
                ? "border-slate-400 bg-slate-100 text-slate-700"
                : "border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {showArchived ? "← Active clients" : "Archived"}
          </button>
          {(search || riskFilter || kycFilter) && (
            <button
              onClick={() => navigate({ search: "", risk: "", kyc: "", page: 1 })}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table / empty state */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 md:p-16 text-center">
          {totalCount === 0 && !search && !riskFilter && !kycFilter ? (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold mb-1">No clients yet</p>
              <p className="text-slate-400 text-sm mb-6">
                Add your first client to start the KYC process.
              </p>
              {canAddClient && (
                <Link
                  href="/clients/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                    text-white text-sm font-medium rounded-lg transition"
                >
                  + Add your first client
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-slate-700 font-semibold mb-1">No results</p>
              <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5">
                  <SortHeader col="name" label="Name" />
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5">
                  <SortHeader col="client_type" label="Type" />
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Assigned broker
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5">
                  <SortHeader col="risk_rating" label="Risk" />
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5">
                  <SortHeader col="kyc_status" label="KYC Status" />
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3.5">
                  <SortHeader col="created_at" label="Added" />
                </th>
                <th className="px-3 md:px-4 py-3 md:py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => {
                const name = clientName(client);
                const isArchived = client.client_status === "archived";
                const kycInfo = KYC_BADGE[client.kyc_status] ?? { label: client.kyc_status, className: "bg-slate-100 text-slate-500" };

                return (
                  <tr key={client.id} className={`transition-colors min-h-[44px] ${isArchived ? "bg-slate-50 opacity-80 hover:opacity-100" : "hover:bg-slate-50"}`}>
                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-2 md:gap-3 group min-h-[44px]"
                      >
                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 ${isArchived ? "bg-slate-200" : "bg-blue-100"}`}>
                          <span className={`text-xs font-semibold ${isArchived ? "text-slate-500" : "text-blue-600"}`}>
                            {initials(client)}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium group-hover:underline ${isArchived ? "text-slate-500" : "text-slate-800 group-hover:text-slate-900"}`}>
                            {name}
                          </span>
                          {isArchived && client.termination_reason && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {TERMINATION_REASON_LABELS[client.termination_reason] ?? client.termination_reason}
                              {client.archived_at && ` · ${formatDate(client.archived_at)}`}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${client.client_type === "individual"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {client.client_type === "individual" ? "Individual" : "Legal"}
                      </span>
                    </td>

                    <td className="hidden md:table-cell px-6 py-4 text-slate-600">
                      {client.broker?.full_name ?? <span className="text-slate-400">—</span>}
                    </td>

                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                        ${RISK_BADGE[client.risk_rating] ?? "bg-slate-100 text-slate-500"}`}
                      >
                        {client.risk_rating === "not_assessed" ? "—" : client.risk_rating}
                      </span>
                    </td>

                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      {isArchived ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                            Archived
                          </span>
                          {client.revival_requires_aml_review && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              AML review required
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kycInfo.className}`}>
                          {kycInfo.label}
                        </span>
                      )}
                    </td>

                    <td className="hidden md:table-cell px-6 py-4 text-slate-400 text-xs">
                      {formatDate(client.created_at)}
                    </td>

                    <td className="px-3 md:px-4 py-2.5 md:py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400
                          hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label={`View ${name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer: count + pagination */}
          <div className="px-4 md:px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {totalCount} client{totalCount !== 1 ? "s" : ""}
              {(search || riskFilter || kycFilter) ? " (filtered)" : showArchived ? " archived" : ""}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage > 1 && (
                  <button
                    onClick={() => navigate({ page: currentPage - 1 })}
                    className="px-2.5 py-1 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    ← Prev
                  </button>
                )}
                {currentPage < totalPages && (
                  <button
                    onClick={() => navigate({ page: currentPage + 1 })}
                    className="px-2.5 py-1 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
