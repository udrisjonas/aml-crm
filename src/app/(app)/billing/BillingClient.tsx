"use client";

import { useState, useTransition } from "react";
import { selectPlanAction, cancelSubscriptionAction } from "@/app/actions/billing";
import { calculateVAT, applyVAT } from "@/lib/billing/vat";

interface Plan {
  id: string;
  name: string;
  monthly_fee: number;
  included_clients: number;
}

interface Subscription {
  id: string;
  plan_id: string | null;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface CompanySettings {
  vat_number?: string | null;
  vat_country?: string | null;
  country?: string | null;
}

interface BillingClientProps {
  plans: Plan[];
  subscription: Subscription;
  activeClientCount: number;
  companySettings: CompanySettings | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  trial:     { label: "Trial",     className: "bg-amber-100 text-amber-800 border border-amber-200" },
  active:    { label: "Active",    className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  locked:    { label: "Expired",   className: "bg-red-100 text-red-700 border border-red-200" },
};

const PLAN_DESCRIPTIONS: Record<string, { tagline: string; features: string[] }> = {
  solo: {
    tagline: "For independent AML officers",
    features: ["Up to 10 active clients", "Full AML client profiles", "Document management", "Email support"],
  },
  standard: {
    tagline: "For growing compliance teams",
    features: ["Up to 40 active clients", "All Solo features", "Multi-user access", "Priority support"],
  },
  professional: {
    tagline: "For large brokerages",
    features: ["Up to 100 active clients", "All Standard features", "Advanced reporting", "Dedicated support"],
  },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// Mock invoice history (replaced with real data once Stripe is integrated)
const MOCK_INVOICES = [
  { id: "INV-001", date: "2024-02-01", description: "Standard Plan — February 2024", net: 79.00, status: "paid" },
  { id: "INV-002", date: "2024-01-01", description: "Standard Plan — January 2024",  net: 79.00, status: "paid" },
];

export default function BillingClient({
  plans,
  subscription,
  activeClientCount,
  companySettings,
}: BillingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = plans.find((p) => p.id === subscription.plan_id) ?? null;
  const vatCountry = companySettings?.vat_country ?? companySettings?.country ?? null;
  const vatResult = calculateVAT(vatCountry, companySettings?.vat_number);

  function handleSelectPlan(planId: string) {
    setActionTarget(planId);
    setError("");
    startTransition(async () => {
      try {
        await selectPlanAction(planId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setActionTarget(null);
      }
    });
  }

  function handleCancel() {
    setError("");
    startTransition(async () => {
      try {
        await cancelSubscriptionAction();
        setShowCancelConfirm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const statusInfo = STATUS_LABELS[subscription.status] ?? STATUS_LABELS.trial;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your plan and billing details.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Current Subscription ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Current Subscription</h2>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Plan</p>
            <p className="text-slate-900 font-semibold capitalize">
              {currentPlan?.name ?? (subscription.status === "trial" ? "Trial" : "None")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly fee</p>
            <p className="text-slate-900 font-semibold">
              {currentPlan
                ? (() => {
                    const { total } = applyVAT(currentPlan.monthly_fee, vatResult);
                    return `€${total.toFixed(2)}`;
                  })()
                : "—"
              }
              {currentPlan && <span className="text-slate-400 text-xs font-normal ml-1">{vatResult.label}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {subscription.status === "trial" ? "Trial ends" : "Period ends"}
            </p>
            <p className="text-slate-900 font-semibold">
              {subscription.status === "trial"
                ? formatDate(subscription.trial_end)
                : formatDate(subscription.current_period_end)
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active clients</p>
            <p className="text-slate-900 font-semibold">
              {activeClientCount}
              {currentPlan && (
                <span className="text-slate-400 text-xs font-normal">
                  {" "}/ {currentPlan.included_clients}
                </span>
              )}
            </p>
          </div>
        </div>

        {subscription.status === "active" && (
          <div className="px-6 pb-5">
            {showCancelConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Cancel your subscription?</span>
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                >
                  {isPending ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Keep plan
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-slate-400 hover:text-red-600 transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Plan Selector ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {subscription.status === "active" ? "Change Plan" : "Choose a Plan"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === subscription.plan_id && subscription.status === "active";
            const isSelecting = isPending && actionTarget === plan.id;
            const { total, vatAmount } = applyVAT(plan.monthly_fee, vatResult);
            const info = PLAN_DESCRIPTIONS[plan.name];

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border p-6 flex flex-col
                  ${isCurrent
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-slate-200"
                  }`}
              >
                {plan.name === "standard" && !isCurrent && (
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
                    Most popular
                  </span>
                )}
                {isCurrent && (
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5">
                    Current plan
                  </span>
                )}
                <h3 className="text-slate-900 font-semibold text-lg capitalize mb-0.5">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-4 flex-1">{info?.tagline}</p>

                <div className="mb-1">
                  <span className="text-2xl font-bold text-slate-900">€{total.toFixed(2)}</span>
                  <span className="text-slate-400 text-sm"> / month</span>
                </div>
                {vatAmount > 0 && (
                  <p className="text-xs text-slate-400 mb-3">
                    €{plan.monthly_fee.toFixed(2)} + {vatResult.label}
                  </p>
                )}

                <ul className="space-y-1.5 mb-5">
                  {info?.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isPending || isCurrent}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default"
                      : plan.name === "standard"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {isCurrent ? "Current plan" : isSelecting ? "Activating…" : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">
          No payment required yet — Stripe integration coming soon.
        </p>
      </section>

      {/* ── Usage Summary ────────────────────────────────────────────────── */}
      {currentPlan && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Usage</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Active clients</span>
              <span className="text-sm font-semibold text-slate-900">
                {activeClientCount} / {currentPlan.included_clients}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  activeClientCount / currentPlan.included_clients > 0.9
                    ? "bg-red-500"
                    : activeClientCount / currentPlan.included_clients > 0.7
                      ? "bg-amber-500"
                      : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(100, (activeClientCount / currentPlan.included_clients) * 100)}%`,
                }}
              />
            </div>
            {activeClientCount >= currentPlan.included_clients && (
              <p className="text-xs text-red-600 mt-2">
                You&apos;ve reached your client limit. Upgrade to add more clients.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Invoice History ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Invoice History</h2>
          <span className="text-xs text-slate-400">Stripe billing available soon</span>
        </div>
        {MOCK_INVOICES.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No invoices yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Invoice</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVOICES.map((inv) => {
                const { total } = applyVAT(inv.net, vatResult);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{inv.id}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {new Date(inv.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">{inv.description}</td>
                    <td className="px-6 py-3.5 text-slate-900 font-semibold text-right">
                      €{total.toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium capitalize">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
