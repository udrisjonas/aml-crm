"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { completeInviteAction } from "@/app/actions/invite";
import type { RoleName } from "@/types/roles";

const ROLE_LABELS: Record<RoleName, string> = {
  system_admin:   "System Admin",
  aml_officer:    "AML Officer",
  broker:         "Broker",
  senior_manager: "Senior Manager",
};

const ROLE_COLORS: Record<RoleName, string> = {
  system_admin:   "bg-purple-100 text-purple-700",
  aml_officer:    "bg-blue-100 text-blue-700",
  broker:         "bg-emerald-100 text-emerald-700",
  senior_manager: "bg-amber-100 text-amber-700",
};

interface Props {
  email: string;
  fullName: string;
  roles: RoleName[];
  logoUrl: string | null;
  companyName: string | null;
}

export default function SetPasswordForm({ email, fullName, roles, logoUrl, companyName }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [logoError, setLogoError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        await completeInviteAction(password);
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand — matches login page exactly */}
      <div className="text-center mb-8">
        {logoUrl && !logoError ? (
          <Image
            src={logoUrl}
            alt={companyName ?? "Logo"}
            width={160}
            height={96}
            className="w-2/5 max-h-24 block mx-auto mb-4 object-contain"
            onError={() => setLogoError(true)}
            unoptimized
          />
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-blue-600">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900">
          {companyName || "AML CRM"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Set your password to activate your account
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Account summary */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          {fullName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Name</span>
              <span className="text-sm font-medium text-slate-800">{fullName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Email</span>
            <span className="text-sm text-slate-700">{email}</span>
          </div>
          {roles.length > 0 && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-500 mt-0.5">Roles</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {roles.map((r) => (
                  <span
                    key={r}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r]}`}
                  >
                    {ROLE_LABELS[r]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
              text-white font-medium rounded-lg text-sm transition
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isPending ? "Activating account…" : "Activate account"}
          </button>
        </form>
      </div>
    </div>
  );
}
