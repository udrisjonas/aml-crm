"use client";

import { useState, useMemo } from "react";
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
  individual_details: { first_name: string; last_name: string } | null;
  broker: { full_name: string | null } | null;
}

interface ClientsTableProps {
  clients: ClientRow[];
}

// ── Badge helpers ────────────────────────────────────────────────────────────

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

export default function ClientsTable({ clients }: ClientsTableProps) {
  const { hasRole } = useRoles();
  const [search, setSearch]         = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [kycFilter, setKycFilter]   = useState("");

  const canAddClient =
    hasRole("broker") || hasRole("aml_officer") || hasRole("system_admin");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      if (q) {
        const name = clientName(c).toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (riskFilter && c.risk_rating !== riskFilter) return false;
      if (kycFilter && c.kyc_status !== kycFilter) return false;
      return true;
    });
  }, [clients, search, riskFilter, kycFilter]);

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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full md:flex-1 md:min-w-[200px] md:max-w-sm px-3.5 py-2 rounded-lg
            border border-slate-300 text-sm text-slate-800 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className={selectClass + " flex-1"}
          >
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className={selectClass + " flex-1"}
          >
            {KYC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(search || riskFilter || kycFilter) && (
            <button
              onClick={() => { setSearch(""); setRiskFilter(""); setKycFilter(""); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table / empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 md:p-16 text-center">
          {clients.length === 0 ? (
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
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Type
                </th>
                {/* Hidden on mobile */}
                <th className="hidden md:table-cell text-left px-6 py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Assigned broker
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Risk
                </th>
                <th className="text-left px-3 md:px-6 py-3 md:py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  KYC status
                </th>
                {/* Hidden on mobile */}
                <th className="hidden md:table-cell text-left px-6 py-3.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Added
                </th>
                <th className="px-3 md:px-4 py-3 md:py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => {
                const name = clientName(client);
                const kycInfo = KYC_BADGE[client.kyc_status] ?? { label: client.kyc_status, className: "bg-slate-100 text-slate-500" };

                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors min-h-[44px]">
                    {/* Name — entire cell content is one link for a large tap target */}
                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-2 md:gap-3 group min-h-[44px]"
                      >
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-600 text-xs font-semibold">
                            {initials(client)}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800 group-hover:text-slate-900 group-hover:underline">
                          {name}
                        </span>
                      </Link>
                    </td>

                    {/* Type */}
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

                    {/* Broker — hidden on mobile */}
                    <td className="hidden md:table-cell px-6 py-4 text-slate-600">
                      {client.broker?.full_name ?? <span className="text-slate-400">—</span>}
                    </td>

                    {/* Risk */}
                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                        ${RISK_BADGE[client.risk_rating] ?? "bg-slate-100 text-slate-500"}`}
                      >
                        {client.risk_rating === "not_assessed" ? "—" : client.risk_rating}
                      </span>
                    </td>

                    {/* KYC status */}
                    <td className="px-3 md:px-6 py-2.5 md:py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kycInfo.className}`}>
                        {kycInfo.label}
                      </span>
                    </td>

                    {/* Date — hidden on mobile */}
                    <td className="hidden md:table-cell px-6 py-4 text-slate-400 text-xs">
                      {formatDate(client.created_at)}
                    </td>

                    {/* Action */}
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

          <div className="px-4 md:px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== clients.length && ` (filtered from ${clients.length})`}
          </div>
        </div>
      )}
    </div>
  );
}
