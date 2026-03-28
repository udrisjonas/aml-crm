"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissNotificationAction } from "@/app/actions/dashboard";

interface Props {
  notificationType: string;
  referenceId: string;
}

export default function DismissButton({ notificationType, referenceId }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissNotificationAction(notificationType, referenceId);
          router.refresh();
        })
      }
      className="shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
      aria-label="Dismiss"
    >
      ✕
    </button>
  );
}
