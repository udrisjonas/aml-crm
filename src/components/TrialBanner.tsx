"use client";

import { useState } from "react";
import Link from "next/link";

interface TrialBannerProps {
  daysRemaining: number;
}

export default function TrialBanner({ daysRemaining }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || daysRemaining > 4) return null;

  const isLastDay = daysRemaining <= 1;

  return (
    <div className={`px-4 py-2.5 flex items-center justify-between gap-4 text-sm
      ${isLastDay
        ? "bg-red-600 text-white"
        : "bg-amber-500 text-amber-950"
      }`}
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="font-medium">
          {isLastDay
            ? "Your trial expires today."
            : `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`}
          {" "}
          <Link href="/billing" className="underline underline-offset-2 font-semibold hover:opacity-80">
            Upgrade now
          </Link>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
