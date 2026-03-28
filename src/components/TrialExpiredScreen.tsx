"use client";

import { useState, useTransition } from "react";
import { selectPlanAction } from "@/app/actions/billing";

interface Plan {
  id: string;
  name: string;
  monthly_fee: number;
  included_clients: number;
}

interface TrialExpiredScreenProps {
  plans: Plan[];
  userEmail: string;
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  solo: "Perfect for independent AML officers managing a small portfolio.",
  standard: "For growing firms with a dedicated compliance team.",
  professional: "Full-scale compliance management for large brokerages.",
};

export default function TrialExpiredScreen({ plans, userEmail }: TrialExpiredScreenProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSelect(planId: string) {
    setSelectedPlanId(planId);
    setError("");
    startTransition(async () => {
      try {
        await selectPlanAction(planId);
        // Page will re-render via layout revalidation
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Your trial has expired</h1>
          <p className="text-slate-400">
            Choose a plan to continue using AML CRM. Your data is safe and will be available immediately after upgrading.
          </p>
          <p className="text-slate-500 text-sm mt-1">Signed in as {userEmail}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isSelecting = isPending && selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-slate-800 border rounded-xl p-6 flex flex-col
                  ${plan.name === "standard"
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-slate-700"
                  }`}
              >
                {plan.name === "standard" && (
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                    Most popular
                  </span>
                )}
                <h3 className="text-white font-semibold text-lg capitalize mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4 flex-1">
                  {PLAN_DESCRIPTIONS[plan.name] ?? ""}
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">€{plan.monthly_fee}</span>
                  <span className="text-slate-400 text-sm"> / month</span>
                </div>
                <div className="text-slate-400 text-sm mb-5">
                  Up to {plan.included_clients} active clients
                </div>
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={isPending}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${plan.name === "standard"
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                >
                  {isSelecting ? "Activating…" : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          No payment required yet — Stripe integration coming soon. Plans activate immediately.
        </p>
      </div>
    </div>
  );
}
