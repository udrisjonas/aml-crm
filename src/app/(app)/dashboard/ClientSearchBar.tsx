"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  searchClientsAction,
  type ClientSearchResult,
} from "@/app/actions/dashboard";

const KYC_BADGE: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  submitted: "bg-blue-100 text-blue-700",
  client_completed: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  not_started: "bg-slate-100 text-slate-600",
};

const RISK_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export default function ClientSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchClientsAction(query);
        setResults(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder="Search clients by name..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No clients found
            </div>
          ) : (
            <>
              {results.map((r) => (
                <Link
                  key={r.id}
                  href={`/clients/${r.id}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-slate-500 text-xs font-semibold">
                        {r.first_name[0]}
                        {r.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {r.first_name} {r.last_name}
                      </p>
                      {r.broker_name && (
                        <p className="text-xs text-slate-400">
                          {r.broker_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {r.client_type === "legal_entity"
                        ? "Legal entity"
                        : "Individual"}
                    </span>
                    {r.kyc_status && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${KYC_BADGE[r.kyc_status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {r.kyc_status.replace(/_/g, " ")}
                      </span>
                    )}
                    {r.risk_rating && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RISK_BADGE[r.risk_rating] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {r.risk_rating}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              <Link
                href={`/clients?search=${encodeURIComponent(query)}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center px-4 py-2.5 border-t border-slate-100 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                View all results for &ldquo;{query}&rdquo; →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
