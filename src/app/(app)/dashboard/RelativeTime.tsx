"use client";

import { useState, useEffect } from "react";

function getRelativeLabel(date: Date, lang: string): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (lang === "lt") {
    if (diffMins < 2) return "Ką tik";
    if (diffMins < 60) return `Prieš ${diffMins} min.`;
    if (diffHours < 24) return `Prieš ${diffHours} val.`;
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return date.toLocaleDateString("lt-LT");
  }
  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB");
}

export default function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => getRelativeLabel(new Date(iso), "en"));

  useEffect(() => {
    const lang =
      typeof window !== "undefined"
        ? (localStorage.getItem("lang") ?? "en")
        : "en";
    setLabel(getRelativeLabel(new Date(iso), lang));
  }, [iso]);

  return (
    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
      {label}
    </span>
  );
}
